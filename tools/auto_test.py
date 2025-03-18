from ragflow_sdk import RAGFlow, DataSet, Chat, Session
import os,time


class RAGFlowTester:
    def __init__(self, api_key, base_url):
        self.rag_object = RAGFlow(api_key=api_key, base_url=base_url)
        self.dataset:DataSet    # 在类初始化时声明
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

    def check_and_upload_documents(self, dir_path):
        """检查并上传目录下的所有文档"""
        print(f"\n2. 检查目录下的文档: {dir_path}")
        try:
            # 获取目录下所有文件
            files = [f for f in os.listdir(dir_path) if os.path.isfile(os.path.join(dir_path, f))]
            if not files:
                print("目录下没有文件")
                return False

            # 获取已存在的文档
            existing_docs = self.dataset.list_documents()
            existing_names = {doc.name: doc for doc in existing_docs}
            
            # 记录需要上传的文件
            self.documents = []
            
            # 处理每个文件
            for file_name in files:
                if file_name in existing_names:
                    print(f"文档已存在: {file_name}")
                    self.documents.append(existing_names[file_name])
                    continue

                file_path = os.path.join(dir_path, file_name)
                with open(file_path, "rb") as f:
                    document_blob = f.read()
                
                uploaded_docs = self.dataset.upload_documents([{
                    "display_name": file_name,
                    "blob": document_blob
                }])
                
                if uploaded_docs:
                    self.documents.append(uploaded_docs[0])
                    print(f"文档上传成功: {file_name}, ID: {uploaded_docs[0].id}")
                else:
                    print(f"文档上传失败: {file_name}")
            
            return len(self.documents) > 0
        except Exception as e:
            print(f"文档处理失败: {str(e)}")
            return False

    def check_and_parse_documents(self):
        """检查并解析所有文档"""
        print("\n3. 检查所有文档解析状态")
        try:
            # 获取需要解析的文档ID列表
            docs_to_parse = []
            for doc in self.documents:
                docs = self.dataset.list_documents(id=doc.id)
                if not docs:
                    print(f"找不到文档: {doc.name}")
                    continue
                
                if docs[0].run != "DONE":
                    docs_to_parse.append(doc.id)
                else:
                    print(f"文档已解析完成: {doc.name}")

            if not docs_to_parse:
                print("所有文档都已解析完成")
                return True

            # 开始解析未完成的文档
            print(f"开始解析 {len(docs_to_parse)} 个文档...")
            self.dataset.async_parse_documents(docs_to_parse)
            
            # 等待所有文档解析完成
            while docs_to_parse:
                for doc_id in docs_to_parse[:]:
                    docs = self.dataset.list_documents(id=doc_id)
                    if not docs:
                        print(f"找不到文档ID: {doc_id}")
                        docs_to_parse.remove(doc_id)
                        continue
                    
                    doc = docs[0]
                    if doc.run == "DONE":
                        print(f"文档解析完成: {doc.name}")
                        docs_to_parse.remove(doc_id)
                    elif doc.run == "FAIL":
                        print(f"文档解析失败: {doc.name}")
                        docs_to_parse.remove(doc_id)
                    else:
                        print(f"文档 {doc.name} 解析进度: {doc.progress*100}%")
                
                if docs_to_parse:
                    time.sleep(2)
            
            return True
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
    docs_dir = os.path.join(current_dir, "docs")  # 文档目录
    
    # 确保 docs 目录存在
    if not os.path.exists(docs_dir):
        os.makedirs(docs_dir)

    # 执行测试流程
    if not tester.get_or_create_dataset("test_dataset"):
        return
    if not tester.check_and_upload_documents(docs_dir):
        return
    if not tester.check_and_parse_documents():
        return
    if not tester.get_or_create_assistant():
        return
    if not tester.get_or_create_session():
        return

    # 开始对话
    question = "大疆 SDK 怎么集成?"
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
