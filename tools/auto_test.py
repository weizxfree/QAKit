from ragflow_sdk import RAGFlow, DataSet
import os,time


class RAGFlowTester:
    def __init__(self, api_key, base_url):
        self.rag_object = RAGFlow(api_key=api_key, base_url=base_url)
        self.dataset: DataSet    # 在类初始化时声明
        self.assistant = None
        self.session = None

    def create_dataset2(self, name="test_dataset"):
        """创建数据集"""
        print(f"\n1. 创建数据集: {name}")
        try:
            # 创建 ParserConfig 实例
            parser_dict = {
                "chunk_token_num": 128,
                "delimiter": "\n!?;。；！？",
                "html4excel": False,
                "layout_recognize": True,
                "raptor": {"user_raptor": False}
            }
            parser_config = DataSet.ParserConfig(self.rag_object, parser_dict)
            
            # 创建数据集
            self.dataset = self.rag_object.create_dataset(
                name=name,
                avatar="",
                description="测试数据集",
                embedding_model="BAAI/bge-large-zh-v1.5",
                permission="me",
                chunk_method="naive",
                parser_config=parser_config
            )
            print(f"数据集创建成功，ID: {self.dataset.id}")
            return True
        except Exception as e:
            print(f"创建数据集失败: {str(e)}")
            return False



def main():
    # 配置参数
    api_key = "ragflow-JiZmFiYWQwMDNkYzExZjA4NDg1NjZmYz"
    base_url = "http://localhost:9222"
    
    # 创建测试实例
    tester = RAGFlowTester(api_key, base_url)
    
    # 执行测试流程
    if not tester.create_dataset2("test_dataset"):
        return

    # 使用文档上传

  # 获取当前脚本所在目录的绝对路径
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # 构建测试文件的绝对路径
    test_file = os.path.join(current_dir, "test.pdf")

    # 上传文档
    with open(test_file, "rb") as f:
        document_blob = f.read()
    tester.dataset.upload_documents([{"display_name": os.path.basename(test_file), "blob": document_blob}])
    print(f"Document uploaded: {os.path.basename(test_file)}")

    # 解析文档
    documents = tester.dataset.list_documents()
    document_ids = [doc.id for doc in documents]
    tester.dataset.async_parse_documents(document_ids)
    print("开始解析文档...")
    
    # 等待解析完成
    while True:
        docs = tester.dataset.list_documents(id=document_ids[0])
        if not docs:
            print("找不到文档")
            return
        
        doc = docs[0]
        if doc.run == "DONE":
            print("文档解析完成")
            break
        elif doc.run == "FAIL":
            print("文档解析失败")
            return
        
        print(f"解析进度: {doc.progress*100}%")
        time.sleep(2)  # 每2秒检查一次状态

    # 创建聊天助手
    assistant_name = "Example Assistant"
    assistant = tester.rag_object.create_chat(name=assistant_name, dataset_ids=[tester.dataset.id])
    print(f"Chat Assistant created: {assistant}")

    # 创建会话
    session = assistant.create_session(name="Example Session")
    print(f"Session created: {session}")

    # 开始对话
    question = "如何安装驱动?"
    print(f"\nUser: {question}")
    print("Assistant: ", end="", flush=True)
    
    # 使用流式输出
    content = ""
    for response in session.ask(question, stream=True):
        new_content = response.content[len(content):]
        print(new_content, end="", flush=True)
        content = response.content
    print()  # 换行

if __name__ == "__main__":
    main()
