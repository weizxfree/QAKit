import { useTranslate } from '@/hooks/common-hooks';
import request from '@/utils/request';
import {
  DatabaseOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Pagination,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import React, { useEffect, useState } from 'react';
import styles from './index.less';

const { Option } = Select;
const { TextArea } = Input;

interface KnowledgeBaseData {
  id: string;
  name: string;
  description: string;
  doc_num: number;
  language: string;
  permission: string;
  chunk_num: number;
  token_num: number;
  create_time: string;
  create_date: string;
}

interface DocumentData {
  id: string;
  name: string;
  chunk_num: number;
  progress: number;
  status: string;
  create_date: string;
}

interface UserData {
  id: string;
  username: string;
}

const KnowledgeManagementPage = () => {
  const { t } = useTranslate('setting');
  const [loading, setLoading] = useState(false);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [knowledgeData, setKnowledgeData] = useState<KnowledgeBaseData[]>([]);
  const [documentList, setDocumentList] = useState<DocumentData[]>([]);
  const [userList, setUserList] = useState<UserData[]>([]);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [currentKnowledgeBase, setCurrentKnowledgeBase] =
    useState<KnowledgeBaseData | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [batchParsingLoading, setBatchParsingLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const [createForm] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const [docPagination, setDocPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  useEffect(() => {
    loadKnowledgeData();
    loadUserList();
  }, [pagination.current, pagination.pageSize, searchValue]);

  const loadKnowledgeData = async () => {
    setLoading(true);
    try {
      const res = await request.get('/api/v1/knowledgebases', {
        params: {
          currentPage: pagination.current,
          size: pagination.pageSize,
          name: searchValue,
        },
      });
      const data = res?.data?.data || {};
      setKnowledgeData(data.list || []);
      setPagination((prev) => ({ ...prev, total: data.total || 0 }));
    } catch (error) {
      message.error('加载知识库数据失败');
    } finally {
      setLoading(false);
    }
  };

  const loadUserList = async () => {
    try {
      const res = await request.get('/api/v1/users', {
        params: {
          currentPage: 1,
          size: 1000,
        },
      });
      const data = res?.data?.data || {};
      const users = (data.list || []).map((user: any) => ({
        id: user.id,
        username: user.username,
      }));
      setUserList(users);
    } catch (error) {
      message.error('加载用户列表失败');
    }
  };

  const loadDocumentList = async (kbId: string) => {
    setDocumentLoading(true);
    try {
      const res = await request.get(
        `/api/v1/knowledgebases/${kbId}/documents`,
        {
          params: {
            currentPage: docPagination.current,
            size: docPagination.pageSize,
          },
        },
      );
      const data = res?.data?.data || {};
      setDocumentList(data.list || []);
      setDocPagination((prev) => ({ ...prev, total: data.total || 0 }));
    } catch (error) {
      message.error('加载文档列表失败');
    } finally {
      setDocumentLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    loadKnowledgeData();
  };

  const handleReset = () => {
    setSearchValue('');
    setPagination((prev) => ({ ...prev, current: 1 }));
    loadKnowledgeData();
  };

  const handleCreate = () => {
    createForm.resetFields();
    setCreateModalVisible(true);
  };

  const handleCreateSubmit = async () => {
    try {
      const values = await createForm.validateFields();
      setLoading(true);
      await request.post('/api/v1/knowledgebases', values);
      message.success('知识库创建成功');
      setCreateModalVisible(false);
      loadKnowledgeData();
    } catch (error) {
      message.error('创建知识库失败');
    } finally {
      setLoading(false);
    }
  };

  const handleView = (record: KnowledgeBaseData) => {
    setCurrentKnowledgeBase(record);
    setViewModalVisible(true);
    loadDocumentList(record.id);
  };

  const handleDelete = async (kbId: string) => {
    setLoading(true);
    try {
      await request.delete(`/api/v1/knowledgebases/${kbId}`);
      message.success('删除成功');
      loadKnowledgeData();
    } catch (error) {
      message.error('删除失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的知识库');
      return;
    }

    setLoading(true);
    try {
      await request.delete('/api/v1/knowledgebases/batch', {
        data: { kbIds: selectedRowKeys },
      });
      setSelectedRowKeys([]);
      message.success(`成功删除 ${selectedRowKeys.length} 个知识库`);
      loadKnowledgeData();
    } catch (error) {
      message.error('批量删除失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchParse = async () => {
    if (!currentKnowledgeBase) return;

    setBatchParsingLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      message.success('批量解析已完成');
      loadDocumentList(currentKnowledgeBase.id);
    } catch (error) {
      message.error('批量解析失败');
    } finally {
      setBatchParsingLoading(false);
    }
  };

  const handleParseDocument = async (doc: DocumentData) => {
    if (doc.progress === 1) {
      message.warning('文档已完成解析，无需再重复解析');
      return;
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // 更新文档解析状态
      const updatedDoc = {
        ...doc,
        progress: 1,
        status: '3',
        chunk_num: Math.floor(Math.random() * 100) + 20,
      };
      const docIndex = documentList.findIndex((d) => d.id === doc.id);
      if (docIndex !== -1) {
        const newDocList = [...documentList];
        newDocList[docIndex] = updatedDoc;
        setDocumentList(newDocList);
      }
      message.success('解析任务已完成');
    } catch (error) {
      message.error('解析任务失败');
    }
  };

  const formatParseStatus = (progress: number): string => {
    if (progress === 0) return '未解析';
    if (progress === 1) return '已完成';
    return `解析中 ${Math.floor(progress * 100)}%`;
  };

  const getParseStatusType = (progress: number): string => {
    if (progress === 0) return 'default';
    if (progress === 1) return 'success';
    return 'processing';
  };

  const columns = [
    {
      title: '序号',
      key: 'index',
      width: 80,
      render: (_: any, __: any, index: number) => (
        <span>
          {(pagination.current - 1) * pagination.pageSize + index + 1}
        </span>
      ),
    },
    {
      title: '知识库名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <Space>
          <DatabaseOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '文档数量',
      dataIndex: 'doc_num',
      key: 'doc_num',
      width: 100,
      render: (count: number) => <Tag color="blue">{count}</Tag>,
    },
    {
      title: '语言',
      dataIndex: 'language',
      key: 'language',
      width: 100,
      render: (lang: string) => (
        <Tag color="geekblue">{lang === 'Chinese' ? '中文' : '英文'}</Tag>
      ),
    },
    {
      title: '权限',
      dataIndex: 'permission',
      key: 'permission',
      width: 100,
      render: (permission: string) => (
        <Tag color={permission === 'me' ? 'green' : 'orange'}>
          {permission === 'me' ? '个人' : '团队'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'create_date',
      key: 'create_date',
      width: 180,
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 200,
      render: (_: any, record: KnowledgeBaseData) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            查看
          </Button>
          <Popconfirm
            title={`确定要删除知识库 "${record.name}" 吗？`}
            description="删除后将无法恢复，且其中的所有文档也将被删除。"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const documentColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <Space>
          <FileOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: '分块数',
      dataIndex: 'chunk_num',
      key: 'chunk_num',
      width: 100,
      render: (count: number) => <Tag color="cyan">{count}</Tag>,
    },
    {
      title: '上传日期',
      dataIndex: 'create_date',
      key: 'create_date',
      width: 180,
    },
    {
      title: '解析状态',
      key: 'status',
      width: 120,
      render: (_: any, record: DocumentData) => (
        <Tag color={getParseStatusType(record.progress)}>
          {formatParseStatus(record.progress)}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: DocumentData) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={() => handleParseDocument(record)}
          >
            解析
          </Button>
          <Button type="link" size="small" icon={<SettingOutlined />}>
            分块规则
          </Button>
        </Space>
      ),
    },
  ];

  const handleTableChange = (page: number, pageSize: number) => {
    setPagination((prev) => ({ ...prev, current: page, pageSize }));
  };

  return (
    <div className={styles.knowledgeManagementWrapper}>
      {/* 搜索区域 */}
      <Card className={styles.searchCard} size="small">
        <Space>
          <Input
            placeholder="请输入知识库名称搜索"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearch}
            loading={loading}
          >
            搜索
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
        </Space>
      </Card>

      {/* 知识库列表 */}
      <Card className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              新建知识库
            </Button>
            <Popconfirm
              title={`确定删除选中的 ${selectedRowKeys.length} 个知识库吗？`}
              description="此操作不可恢复，且其中的所有文档也将被删除"
              onConfirm={handleBatchDelete}
              disabled={selectedRowKeys.length === 0}
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                disabled={selectedRowKeys.length === 0}
              >
                批量删除
              </Button>
            </Popconfirm>
          </Space>
          <Button icon={<ReloadOutlined />} onClick={loadKnowledgeData}>
            刷新
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={knowledgeData}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ x: 1200 }}
          rowSelection={{
            selectedRowKeys,
            onChange: (selectedRowKeys: React.Key[]) =>
              setSelectedRowKeys(selectedRowKeys as string[]),
          }}
        />

        <div className={styles.paginationWrapper}>
          <Pagination
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onChange={handleTableChange}
            showSizeChanger
            showQuickJumper
            showTotal={(total, range) =>
              `第 ${range[0]}-${range[1]} 条/共 ${total} 条`
            }
          />
        </div>
      </Card>

      {/* 新建知识库模态框 */}
      <Modal
        title="新建知识库"
        open={createModalVisible}
        onOk={handleCreateSubmit}
        onCancel={() => setCreateModalVisible(false)}
        confirmLoading={loading}
        destroyOnClose
        width={600}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            name="name"
            label="知识库名称"
            rules={[
              { required: true, message: '请输入知识库名称' },
              { min: 2, max: 50, message: '长度在 2 到 50 个字符' },
            ]}
          >
            <Input placeholder="请输入知识库名称" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
            rules={[{ max: 200, message: '描述不能超过200个字符' }]}
          >
            <TextArea rows={3} placeholder="请输入知识库描述" />
          </Form.Item>
          <Form.Item
            name="language"
            label="语言"
            initialValue="Chinese"
            rules={[{ required: true, message: '请选择语言' }]}
          >
            <Select>
              <Option value="Chinese">中文</Option>
              <Option value="English">英文</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="permission"
            label="权限"
            initialValue="me"
            rules={[{ required: true, message: '请选择权限' }]}
          >
            <Select>
              <Option value="me">个人</Option>
              <Option value="team">团队</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 知识库详情模态框 */}
      <Modal
        title={`知识库详情 - ${currentKnowledgeBase?.name || ''}`}
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        width={1000}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        {currentKnowledgeBase && (
          <div>
            <Descriptions
              className={styles.kbInfo}
              column={2}
              bordered
              size="small"
            >
              <Descriptions.Item label="知识库ID">
                {currentKnowledgeBase.id}
              </Descriptions.Item>
              <Descriptions.Item label="文档总数">
                {currentKnowledgeBase.doc_num}
              </Descriptions.Item>
              <Descriptions.Item label="语言">
                <Tag color="geekblue">
                  {currentKnowledgeBase.language === 'Chinese'
                    ? '中文'
                    : '英文'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="权限">
                <Tag
                  color={
                    currentKnowledgeBase.permission === 'me'
                      ? 'green'
                      : 'orange'
                  }
                >
                  {currentKnowledgeBase.permission === 'me' ? '个人' : '团队'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <div className={styles.documentHeader}>
              <Space>
                <Button type="primary" icon={<PlusOutlined />}>
                  添加文档
                </Button>
                <Button
                  type="default"
                  icon={<ThunderboltOutlined />}
                  loading={batchParsingLoading}
                  onClick={handleBatchParse}
                  disabled={documentList.length === 0}
                >
                  {batchParsingLoading ? '正在批量解析...' : '批量解析'}
                </Button>
              </Space>
            </div>

            {batchParsingLoading && (
              <Alert
                message="正在进行批量解析"
                description="该过程将在后台运行，您可以稍后查看结果。"
                type="info"
                showIcon
                className={styles.batchAlert}
              />
            )}

            <div className={styles.documentTableWrapper}>
              <Table
                columns={documentColumns}
                dataSource={documentList}
                rowKey="id"
                loading={documentLoading}
                pagination={false}
                size="small"
                locale={{
                  emptyText: <Empty description="暂无文档数据" />,
                }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default KnowledgeManagementPage;
