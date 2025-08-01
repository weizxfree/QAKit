import json
import os
import requests
from urllib.parse import urlparse
from base64 import b64encode
from glob import glob
from typing import Tuple, Union, Optional
import gc
import copy

import uvicorn
from fastapi import FastAPI, UploadFile
from fastapi.responses import JSONResponse
from loguru import logger

from mineru.data.data_reader_writer import FileBasedDataWriter
from mineru.data.data_reader_writer.s3 import S3DataReader, S3DataWriter
from mineru.utils.config_reader import get_bucket_name, get_s3_config
from fastapi import Form
from mineru.cli.common import convert_pdf_bytes_to_bytes_by_pypdfium2
from mineru.backend.pipeline.pipeline_analyze import doc_analyze as pipeline_doc_analyze
from mineru.backend.pipeline.model_json_to_middle_json import result_to_middle_json as pipeline_result_to_middle_json
from mineru.backend.pipeline.pipeline_middle_json_mkcontent import union_make as pipeline_union_make
from mineru.backend.vlm.vlm_analyze import doc_analyze as vlm_doc_analyze
from mineru.backend.vlm.vlm_middle_json_mkcontent import union_make as vlm_union_make
from mineru.utils.enum_class import MakeMode
from mineru.utils.draw_bbox import draw_layout_bbox, draw_span_bbox
from mineru.utils.language import remove_invalid_surrogates

app = FastAPI()

pdf_extensions = [".pdf"]
office_extensions = [".ppt", ".pptx", ".doc", ".docx"]
image_extensions = [".png", ".jpg", ".jpeg"]

def validate_server_url(url: str) -> bool:
    """
    验证 server_url 的格式是否正确
    
    Args:
        url: 要验证的 URL
        
    Returns:
        bool: URL 格式是否有效
    """
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except Exception:
        return False

def clean_data_for_json(data):
    """
    递归清理数据中的所有字符串，移除无效的UTF-16代理字符
    防止JSON序列化时出现UTF-8编码错误
    """
    if isinstance(data, str):
        return remove_invalid_surrogates(data)
    elif isinstance(data, dict):
        return {key: clean_data_for_json(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [clean_data_for_json(item) for item in data]
    elif isinstance(data, tuple):
        return tuple(clean_data_for_json(item) for item in data)
    else:
        return data


def check_sglang_server_health(server_url: str, timeout: int = 10) -> Tuple[bool, str]:
    """
    检查 SGLang 服务器的健康状态
    
    Args:
        server_url: SGLang 服务器地址
        timeout: 超时时间（秒）
        
    Returns:
        Tuple[bool, str]: (是否健康, 状态信息)
    """
    try:
        # 尝试连接健康检查端点
        health_url = f"{server_url.rstrip('/')}/health"
        response = requests.get(health_url, timeout=timeout)
        if response.status_code == 200:
            return True, "SGLang server is healthy"
        else:
            return False, f"SGLang server returned status {response.status_code}"
    except requests.exceptions.Timeout:
        return False, f"SGLang server health check timeout after {timeout}s"
    except requests.exceptions.ConnectionError:
        return False, "Cannot connect to SGLang server"
    except Exception as e:
        return False, f"SGLang server health check failed: {str(e)}"

def init_writers(
    file_path: Optional[str] = None,
    file: Optional[UploadFile] = None,
    output_path: Optional[str] = None,
    output_image_path: Optional[str] = None,
) -> Tuple[
    Union[S3DataWriter, FileBasedDataWriter],
    Union[S3DataWriter, FileBasedDataWriter],
    bytes,
    str,
]:
    """
    Initialize writers based on path type

    Args:
        file_path: file path (local path or S3 path)
        file: Uploaded file object
        output_path: Output directory path
        output_image_path: Image output directory path

    Returns:
        Tuple[writer, image_writer, file_bytes, file_extension]: Returns initialized writer tuple and file content
    """
    file_extension: str = ""
    file_bytes: bytes = b""
    
    output_path_checked = output_path if output_path else "output"
    output_image_path_checked = output_image_path if output_image_path else f"{output_path_checked}/images"


    if file_path:
        is_s3_path = file_path.startswith("s3://")
        if is_s3_path:
            bucket = get_bucket_name(file_path)
            ak, sk, endpoint = get_s3_config(bucket)

            writer = S3DataWriter(
                output_path_checked, bucket=bucket, ak=ak, sk=sk, endpoint_url=endpoint
            )
            image_writer = S3DataWriter(
                output_image_path_checked, bucket=bucket, ak=ak, sk=sk, endpoint_url=endpoint
            )
            # 临时创建reader读取文件内容
            temp_reader = S3DataReader(
                "", bucket=bucket, ak=ak, sk=sk, endpoint_url=endpoint
            )
            file_bytes = temp_reader.read(file_path)
            file_extension = os.path.splitext(file_path)[1]
        else:
            writer = FileBasedDataWriter(output_path_checked)
            image_writer = FileBasedDataWriter(output_image_path_checked)
            os.makedirs(output_image_path_checked, exist_ok=True)
            with open(file_path, "rb") as f:
                file_bytes = f.read()
            file_extension = os.path.splitext(file_path)[1]
    elif file:
        # 处理上传的文件
        content = file.file.read()
        if isinstance(content, str):
            file_bytes = content.encode("utf-8")
        else:
            file_bytes = content
        file_extension = os.path.splitext(file.filename)[1] if file.filename else ""

        writer = FileBasedDataWriter(output_path_checked)
        image_writer = FileBasedDataWriter(output_image_path_checked)
        os.makedirs(output_image_path_checked, exist_ok=True)
    else:
        raise ValueError("Must provide either file or file_path")


    return writer, image_writer, file_bytes, file_extension


def process_file_pipeline(
    file_bytes: bytes,
    file_extension: str,
    image_writer: Union[S3DataWriter, FileBasedDataWriter],
    parse_method: str = "auto",
    lang: str = "ch",
    formula_enable: bool = True,
    table_enable: bool = True,
):
    """Pipeline 模式处理函数"""
    processed_bytes = file_bytes
    if file_extension in pdf_extensions:
        processed_bytes = convert_pdf_bytes_to_bytes_by_pypdfium2(file_bytes, 0, None)
    
    infer_results, all_image_lists, all_pdf_docs, lang_list, ocr_enabled_list = pipeline_doc_analyze(
        [processed_bytes], [lang], parse_method, formula_enable, table_enable
    )
    
    model_list = infer_results[0]
    images_list = all_image_lists[0]
    pdf_doc = all_pdf_docs[0]
    _lang = lang_list[0]
    _ocr_enable = ocr_enabled_list[0]

    # 优化深拷贝方式，避免JSON序列化的内存浪费
    model_json = copy.deepcopy(model_list)
    
    middle_json = pipeline_result_to_middle_json(model_list, images_list, pdf_doc, image_writer, _lang, _ocr_enable, formula_enable)
    
    md_content = pipeline_union_make(middle_json["pdf_info"], MakeMode.MM_MD, "images")
    content_list = pipeline_union_make(middle_json["pdf_info"], MakeMode.CONTENT_LIST, "images")
    
    return model_json, middle_json, content_list, md_content, processed_bytes, middle_json["pdf_info"]


def process_file_vlm(
    file_bytes: bytes,
    file_extension: str,
    image_writer: Union[S3DataWriter, FileBasedDataWriter],
    backend: str = "transformers",
    server_url: Optional[str] = None,
):
    """VLM 模式处理函数"""
    logger.info(f"Starting VLM processing with backend: {backend}")
    if server_url:
        logger.info(f"Using server URL: {server_url}")
    
    processed_bytes = file_bytes
    if file_extension in pdf_extensions:
        processed_bytes = convert_pdf_bytes_to_bytes_by_pypdfium2(file_bytes, 0, None)
        logger.info("PDF converted to bytes for VLM processing")
    
    # 使用 VLM 后端进行解析
    logger.info(f"Calling vlm_doc_analyze with backend={backend}, server_url={server_url}")
    middle_json, infer_result = vlm_doc_analyze(
        processed_bytes, 
        image_writer=image_writer, 
        backend=backend, 
        server_url=server_url
    )
    logger.info("VLM document analysis completed successfully")
    
    pdf_info = middle_json["pdf_info"]
    
    # 生成 markdown 和内容列表
    logger.info("Generating markdown and content list from VLM results")
    md_content = vlm_union_make(pdf_info, MakeMode.MM_MD, "images")
    content_list = vlm_union_make(pdf_info, MakeMode.CONTENT_LIST, "images")
    logger.info("Markdown and content list generation completed")
    
    # 构造类似于 pipeline 的 model_json 格式
    model_json = {
        "model_output": infer_result,
        "backend": backend
    }
    
    logger.info(f"VLM processing completed successfully with backend: {backend}")
    return model_json, middle_json, content_list, md_content, processed_bytes, pdf_info


def encode_image(image_path: str) -> str:
    """Encode image using base64"""
    with open(image_path, "rb") as f:
        return b64encode(f.read()).decode()


@app.post(
    "/file_parse",
    tags=["projects"],
    summary="Parse files (supports local files and S3)",
)
def file_parse(
    file: Optional[UploadFile] = None,
    file_path: Optional[str] = Form(None),
    backend: str = Form("pipeline"),
    parse_method: str = Form("auto"),
    lang: str = Form("ch"),
    formula_enable: bool = Form(True),
    table_enable: bool = Form(True),
    server_url: Optional[str] = Form(None),
    is_json_md_dump: bool = Form(False),
    output_dir: str = Form("output"),
    return_layout: bool = Form(False),
    return_info: bool = Form(False),
    return_content_list: bool = Form(False),
    return_images: bool = Form(False),
):
    """
    Execute the process of converting PDF to JSON and MD, outputting MD and JSON files
    to the specified directory.

    Args:
        file: The PDF file to be parsed. Must not be specified together with
            `file_path`
        file_path: The path to the PDF file to be parsed. Must not be specified together
            with `file`
        backend: Parsing backend, can be pipeline, vlm-transformers, vlm-sglang-engine, 
            or vlm-sglang-client. Default is pipeline.
        parse_method: Parsing method, can be auto, ocr, or txt. Default is auto. If
            results are not satisfactory, try ocr (only for pipeline backend)
        lang: Language for parsing. Default is 'ch' (only for pipeline backend)
        formula_enable: Whether to enable formula parsing. Default to True (only for pipeline backend)
        table_enable: Whether to enable table parsing. Default to True (only for pipeline backend)
        server_url: Server URL for vlm-sglang-client backend
        is_json_md_dump: Whether to write parsed data to .json and .md files. Default
            to False. Different stages of data will be written to different .json files
            (3 in total), md content will be saved to .md file
        output_dir: Output directory for results. A folder named after the PDF file
            will be created to store all results
        return_layout: Whether to return parsed PDF layout. Default to False
        return_info: Whether to return parsed PDF info. Default to False
        return_content_list: Whether to return parsed PDF content list. Default to False
        return_images: Whether to return images as base64. Default to False
    """
    try:
        if (file is None and file_path is None) or (
            file is not None and file_path is not None
        ):
            return JSONResponse(
                content={"error": "Must provide either file or file_path"},
                status_code=400,
            )

        # 验证后端类型
        supported_backends = ["pipeline", "vlm-transformers", "vlm-sglang-engine", "vlm-sglang-client"]
        if backend not in supported_backends:
            return JSONResponse(
                content={"error": f"Unsupported backend: {backend}. Supported: {supported_backends}"},
                status_code=400,
            )

        # 对于 vlm-sglang-client，server_url 是必需的
        if backend == "vlm-sglang-client":
            # 检查是否提供了 server_url，如果没有则尝试使用环境变量或默认值
            if not server_url:
                server_url = os.environ.get("SGLANG_SERVER_URL", os.environ.get("MINERU_VLM_SERVER_URL"))
                
                # 如果仍然没有，尝试使用默认的本地地址
                if not server_url:
                    default_url = "http://localhost:30000"
                    logger.info(f"No server_url provided, attempting to use default: {default_url}")
                    
                    # 先检查默认地址是否可用
                    is_default_healthy, _ = check_sglang_server_health(default_url, timeout=3)
                    if is_default_healthy:
                        server_url = default_url
                        logger.info(f"Using default SGLang server at: {default_url}")
                    else:
                        # 提供详细的错误信息和解决方案
                        error_msg = """server_url is required for vlm-sglang-client backend.

解决方案:
1. 设置环境变量: export SGLANG_SERVER_URL=http://localhost:30000
2. 在请求中指定参数: -F "server_url=http://localhost:30000"
3. 确保SGLang服务正在运行: curl http://localhost:30000/health

如果使用Docker完整版，SGLang服务应该自动在30000端口启动。"""
                        
                        return JSONResponse(
                            content={"error": error_msg},
                            status_code=400,
                        )
            
            # 验证 server_url 格式
            if not validate_server_url(server_url):
                return JSONResponse(
                    content={"error": f"Invalid server_url format: {server_url}. Please provide a valid URL (e.g., http://localhost:30000)"},
                    status_code=400,
                )
            
            # 检查 SGLang 服务器健康状态
            logger.info(f"Checking SGLang server health at: {server_url}")
            is_healthy, health_msg = check_sglang_server_health(server_url)
            if not is_healthy:
                logger.warning(f"SGLang server health check failed: {health_msg}")
                error_msg = f"""SGLang server is not accessible: {health_msg}

故障排除:
1. 检查SGLang服务是否运行: curl {server_url}/health  
2. 确认端口是否正确开放
3. 如果使用Docker，确保使用完整版镜像 (INSTALL_TYPE=all)
4. 检查防火墙设置

服务器地址: {server_url}"""
                
                return JSONResponse(
                    content={"error": error_msg},
                    status_code=503,
                )
            logger.info(f"SGLang server health check passed: {health_msg}")

        # Get PDF filename
        if file_path:
            file_name = os.path.basename(file_path)
        elif file and file.filename:
            file_name = os.path.basename(file.filename)
        else:
             return JSONResponse(
                content={"error": "Could not determine filename."},
                status_code=400,
            )
        
        file_name = file_name.split(".")[0]
        output_path = f"{output_dir}/{file_name}"
        output_image_path = f"{output_path}/images"

        # Initialize readers/writers and get PDF content
        writer, image_writer, file_bytes, file_extension = init_writers(
            file_path=file_path,
            file=file,
            output_path=output_path,
            output_image_path=output_image_path,
        )

        if file_extension not in pdf_extensions + image_extensions:
            return JSONResponse(
                content={"error": f"File type {file_extension} is not supported."},
                status_code=400,
            )

        # Process file based on backend
        if backend == "pipeline":
            model_json, middle_json, content_list, md_content, processed_bytes, pdf_info = process_file_pipeline(
                file_bytes, file_extension, image_writer, parse_method, lang, formula_enable, table_enable
            )
        else:
            # VLM backends
            vlm_backend = backend[4:] if backend.startswith("vlm-") else backend
            model_json, middle_json, content_list, md_content, processed_bytes, pdf_info = process_file_vlm(
                file_bytes, file_extension, image_writer, vlm_backend, server_url
            )

        # If results need to be saved
        if is_json_md_dump:
            writer.write_string(
                f"{file_name}_content_list.json", json.dumps(content_list, indent=4, ensure_ascii=False)
            )
            writer.write_string(f"{file_name}.md", str(md_content))
            writer.write_string(
                f"{file_name}_middle.json", json.dumps(middle_json, indent=4, ensure_ascii=False)
            )
            writer.write_string(
                f"{file_name}_model.json",
                json.dumps(model_json, indent=4, ensure_ascii=False),
            )
            # Save visualization results (only for pipeline backend)
            if backend == "pipeline" and not isinstance(writer, S3DataWriter):
                draw_layout_bbox(pdf_info, processed_bytes, output_path, f"{file_name}_layout.pdf")
                draw_span_bbox(pdf_info, processed_bytes, output_path, f"{file_name}_span.pdf")

        # Build return data
        data = {}
        if return_layout:
            data["layout"] = model_json
        if return_info:
            data["info"] = middle_json
        if return_content_list:
            data["content_list"] = content_list
        if return_images:
            if not isinstance(image_writer, S3DataWriter):
                image_paths = glob(f"{output_image_path}/*.jpg")
                data["images"] = {
                    os.path.basename(
                        image_path
                    ): f"data:image/jpeg;base64,{encode_image(image_path)}"
                    for image_path in image_paths
                }
            else:
                logger.warning("return_images is not supported for S3 storage yet.")
                data["images"] = {}
                
        data["md_content"] = md_content  # md_content is always returned
        data["backend"] = backend  # 返回使用的后端信息

        cleaned_data = clean_data_for_json(data)        
        return JSONResponse(cleaned_data, status_code=200)


    except Exception as e:
        # 也需要清理错误信息中的无效字符
        error_message = clean_data_for_json(str(e))
        return JSONResponse(content={"error": error_message}, status_code=500)
    finally:
        # 统一在请求结束后进行垃圾回收，释放内存
        gc.collect()


if __name__ == "__main__":
    # os.environ['MINERU_MODEL_SOURCE'] = "modelscope"
    uvicorn.run(app, host="0.0.0.0", port=8888)
