from ragflow_sdk import RAGFlow, DataSet, Chat, Session
import os,time


class RAGFlowTester:
    def __init__(self, api_key, base_url):
        self.rag_object = RAGFlow(api_key=api_key, base_url=base_url)
        self.dataset: DataSet    # 在类初始化时声明
        self.assistant:Chat 
        self.session:Session

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

    def get_or_create_dataset(self, name="test_dataset"):
        """获取或创建数据集"""
        print(f"\n1. 检查数据集: {name}")
        try:
            # 尝试获取已存在的数据集
            self.dataset = self.rag_object.get_dataset(name)
            print(f"获取已存在的数据集，ID: {self.dataset.id}")
            return True
        except Exception:
            print("数据集不存在，开始创建...")
            return self.create_dataset2(name)

    def check_and_upload_document(self, file_path):
        """检查并上传文档"""
        print("\n2. 检查文档")
        try:
            docs = self.dataset.list_documents()
            if docs:
                self.document = docs[0]
                print(f"文档已存在，ID: {self.document.id}")
                return True

            # 文档不存在，上传文档
            with open(file_path, "rb") as f:
                document_blob = f.read()
            uploaded_docs = self.dataset.upload_documents([{
                "display_name": os.path.basename(file_path),
                "blob": document_blob
            }])
            if uploaded_docs:
                self.document = uploaded_docs[0]
                print(f"文档上传成功，ID: {self.document.id}")
                return True
            return False
        except Exception as e:
            print(f"文档处理失败: {str(e)}")
            return False

    def check_and_parse_document(self):
        """检查并解析文档"""
        print("\n3. 检查文档解析状态")
        try:
            docs = self.dataset.list_documents(id=self.document.id)
            if not docs:
                raise Exception("找不到文档")
            
            doc = docs[0]
            if doc.run == "DONE":
                print("文档已解析完成")
                return True
            elif doc.run == "FAIL":
                print("文档之前解析失败，重新解析")
            else:
                print("文档未解析，开始解析")

            # 开始解析
            self.dataset.async_parse_documents([self.document.id])
            print("开始解析文档...")
            
            while True:
                docs = self.dataset.list_documents(id=self.document.id)
                if not docs:
                    raise Exception("找不到文档")
                
                doc = docs[0]
                if doc.run == "DONE":
                    print("文档解析完成")
                    return True
                elif doc.run == "FAIL":
                    raise Exception("文档解析失败")
                
                print(f"解析进度: {doc.progress*100}%")
                time.sleep(2)
        except Exception as e:
            print(f"解析文档失败: {str(e)}")
            return False

    def get_or_create_assistant(self, name="Example Assistant"):
        """获取或创建聊天助手"""
        print(f"\n4. 检查聊天助手: {name}")
        try:
            # 查找现有助手
            assistants = self.rag_object.list_chats(name=name)
            if assistants:
                self.assistant = assistants[0]
                print(f"获取已存在的聊天助手，ID: {self.assistant.id}")
                return True

            # 创建新助手
            self.assistant = self.rag_object.create_chat(
                name=name,
                dataset_ids=[self.dataset.id]
            )
            print(f"聊天助手创建成功，ID: {self.assistant.id}")
            return True
        except Exception as e:
            print(f"处理聊天助手失败: {str(e)}")
            return False

    def get_or_create_session(self, name="Example Session"):
        """获取或创建会话"""
        print(f"\n5. 检查会话: {name}")
        try:
            # 查找现有会话
            sessions = self.assistant.list_sessions(name=name)
            if sessions:
                self.session = sessions[0]
                print(f"获取已存在的会话，ID: {self.session.id}")
                return True

            # 创建新会话
            self.session = self.assistant.create_session(name=name)
            print(f"会话创建成功，ID: {self.session.id}")
            return True
        except Exception as e:
            print(f"处理会话失败: {str(e)}")
            return False

def main():
    # 配置参数
    api_key = "ragflow-JiZmFiYWQwMDNkYzExZjA4NDg1NjZmYz"
    base_url = "http://localhost:9222"
    
    # 创建测试实例
    tester = RAGFlowTester(api_key, base_url)
    
    # 获取当前脚本所在目录的绝对路径
    current_dir = os.path.dirname(os.path.abspath(__file__))
    test_file = os.path.join(current_dir, "test.pdf")

    # 执行测试流程
    if not tester.get_or_create_dataset("test_dataset"):
        return
    if not tester.check_and_upload_document(test_file):
        return
    if not tester.check_and_parse_document():
        return
    if not tester.get_or_create_assistant():
        return
    if not tester.get_or_create_session():
        return

    # 开始对话
    question = "设备有哪些单元名称?"
    print(f"\nUser: {question}")
    print("Assistant: ", end="", flush=True)
    
    content = ""
    for response in tester.session.ask(question, stream=True):
        new_content = response.content[len(content):]
        print(new_content, end="", flush=True)
        content = response.content
    print()

if __name__ == "__main__":
    main()
