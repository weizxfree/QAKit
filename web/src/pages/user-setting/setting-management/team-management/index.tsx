import { useTranslate } from '@/hooks/common-hooks';
import {
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Pagination,
  Popconfirm,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import React, { useEffect, useState } from 'react';
import styles from './index.less';

const { Option } = Select;

interface TeamData {
  id: string;
  name: string;
  ownerName: string;
  memberCount: number;
  createTime: string;
  updateTime: string;
}

interface TeamMember {
  userId: string;
  username: string;
  role: string;
  joinTime: string;
}

interface UserData {
  id: string;
  username: string;
}

const TeamManagementPage = () => {
  const { t } = useTranslate('setting');
  const [loading, setLoading] = useState(false);
  const [memberLoading, setMemberLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(false);

  const [teamData, setTeamData] = useState<TeamData[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [userList, setUserList] = useState<UserData[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserData[]>([]);

  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
  const [currentTeam, setCurrentTeam] = useState<TeamData | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('normal');

  const [searchForm] = Form.useForm();
  const [addMemberForm] = Form.useForm();

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // 模拟团队数据
  const mockTeams: TeamData[] = [
    {
      id: '1',
      name: '开发团队',
      ownerName: 'admin',
      memberCount: 5,
      createTime: '2024-01-01 10:00:00',
      updateTime: '2024-01-01 10:00:00',
    },
    {
      id: '2',
      name: '测试团队',
      ownerName: 'user1',
      memberCount: 3,
      createTime: '2024-01-02 10:00:00',
      updateTime: '2024-01-02 10:00:00',
    },
    {
      id: '3',
      name: '产品团队',
      ownerName: 'user2',
      memberCount: 2,
      createTime: '2024-01-03 10:00:00',
      updateTime: '2024-01-03 10:00:00',
    },
  ];

  // 模拟成员数据
  const mockMembers: { [key: string]: TeamMember[] } = {
    '1': [
      {
        userId: '1',
        username: 'admin',
        role: 'owner',
        joinTime: '2024-01-01 10:00:00',
      },
      {
        userId: '2',
        username: 'user1',
        role: 'normal',
        joinTime: '2024-01-02 10:00:00',
      },
      {
        userId: '3',
        username: 'user2',
        role: 'normal',
        joinTime: '2024-01-03 10:00:00',
      },
      {
        userId: '4',
        username: 'dev1',
        role: 'normal',
        joinTime: '2024-01-04 10:00:00',
      },
      {
        userId: '5',
        username: 'dev2',
        role: 'normal',
        joinTime: '2024-01-05 10:00:00',
      },
    ],
    '2': [
      {
        userId: '2',
        username: 'user1',
        role: 'owner',
        joinTime: '2024-01-02 10:00:00',
      },
      {
        userId: '6',
        username: 'test1',
        role: 'normal',
        joinTime: '2024-01-06 10:00:00',
      },
      {
        userId: '7',
        username: 'test2',
        role: 'normal',
        joinTime: '2024-01-07 10:00:00',
      },
    ],
    '3': [
      {
        userId: '3',
        username: 'user2',
        role: 'owner',
        joinTime: '2024-01-03 10:00:00',
      },
      {
        userId: '8',
        username: 'pm1',
        role: 'normal',
        joinTime: '2024-01-08 10:00:00',
      },
    ],
  };

  // 模拟用户数据
  const mockUsers: UserData[] = [
    { id: '1', username: 'admin' },
    { id: '2', username: 'user1' },
    { id: '3', username: 'user2' },
    { id: '4', username: 'dev1' },
    { id: '5', username: 'dev2' },
    { id: '6', username: 'test1' },
    { id: '7', username: 'test2' },
    { id: '8', username: 'pm1' },
    { id: '9', username: 'newuser1' },
    { id: '10', username: 'newuser2' },
  ];

  useEffect(() => {
    loadTeamData();
    loadUserList();
  }, [pagination.current, pagination.pageSize]);

  const loadTeamData = async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setTeamData(mockTeams);
      setPagination((prev) => ({ ...prev, total: mockTeams.length }));
    } catch (error) {
      message.error('加载团队数据失败');
    } finally {
      setLoading(false);
    }
  };

  const loadUserList = async () => {
    setUserLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setUserList(mockUsers);
    } catch (error) {
      message.error('加载用户列表失败');
    } finally {
      setUserLoading(false);
    }
  };

  const loadTeamMembers = async (teamId: string) => {
    setMemberLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const members = mockMembers[teamId] || [];
      setTeamMembers(members);

      // 更新可添加的用户列表
      const memberUserIds = new Set(members.map((member) => member.userId));
      const available = userList.filter((user) => !memberUserIds.has(user.id));
      setAvailableUsers(available);
    } catch (error) {
      message.error('加载团队成员失败');
      setTeamMembers([]);
    } finally {
      setMemberLoading(false);
    }
  };

  const handleSearch = async () => {
    const values = searchForm.getFieldsValue();
    console.log('搜索条件:', values);
    loadTeamData();
  };

  const handleReset = () => {
    searchForm.resetFields();
    loadTeamData();
  };

  const handleManageMembers = (team: TeamData) => {
    setCurrentTeam(team);
    setMemberModalVisible(true);
    loadTeamMembers(team.id);
  };

  const handleAddMember = () => {
    setSelectedUser('');
    setSelectedRole('normal');
    addMemberForm.resetFields();
    setAddMemberModalVisible(true);
  };

  const handleAddMemberSubmit = async () => {
    try {
      const values = await addMemberForm.validateFields();
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 更新模拟数据
      const selectedUserData = userList.find((u) => u.id === values.userId);
      if (selectedUserData && currentTeam) {
        const newMember: TeamMember = {
          userId: values.userId,
          username: selectedUserData.username,
          role: values.role,
          joinTime: new Date().toLocaleString(),
        };

        if (!mockMembers[currentTeam.id]) {
          mockMembers[currentTeam.id] = [];
        }
        mockMembers[currentTeam.id].push(newMember);

        // 更新团队成员数量
        const updatedTeams = teamData.map((team) =>
          team.id === currentTeam.id
            ? { ...team, memberCount: team.memberCount + 1 }
            : team,
        );
        setTeamData(updatedTeams);

        message.success('添加成员成功');
        setAddMemberModalVisible(false);
        loadTeamMembers(currentTeam.id);
      }
    } catch (error) {
      message.error('添加成员失败');
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (!currentTeam) return;

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 更新模拟数据
      if (mockMembers[currentTeam.id]) {
        mockMembers[currentTeam.id] = mockMembers[currentTeam.id].filter(
          (m) => m.userId !== member.userId,
        );

        // 更新团队成员数量
        const updatedTeams = teamData.map((team) =>
          team.id === currentTeam.id
            ? { ...team, memberCount: team.memberCount - 1 }
            : team,
        );
        setTeamData(updatedTeams);

        message.success('移除成员成功');
        loadTeamMembers(currentTeam.id);
      }
    } catch (error) {
      message.error('移除成员失败');
    }
  };

  const handleDeleteTeam = () => {
    message.info('如需解散该团队，可直接删除负责人账号');
  };

  const columns = [
    {
      title: '团队名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <Space>
          <TeamOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: '负责人',
      dataIndex: 'ownerName',
      key: 'ownerName',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '成员数量',
      dataIndex: 'memberCount',
      key: 'memberCount',
      render: (count: number) => <Tag color="green">{count}人</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      key: 'updateTime',
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 200,
      render: (_: any, record: TeamData) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<UserOutlined />}
            onClick={() => handleManageMembers(record)}
          >
            成员管理
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={handleDeleteTeam}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const memberColumns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      render: (text: string) => (
        <Space>
          <UserOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={role === 'owner' ? 'red' : 'blue'}>
          {role === 'owner' ? '拥有者' : '普通成员'}
        </Tag>
      ),
    },
    {
      title: '加入时间',
      dataIndex: 'joinTime',
      key: 'joinTime',
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: TeamMember) => (
        <Popconfirm
          title={`确认将 ${record.username} 从团队中移除吗？`}
          onConfirm={() => handleRemoveMember(record)}
          disabled={record.role === 'owner'}
        >
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            disabled={record.role === 'owner'}
          >
            移除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const handleTableChange = (page: number, pageSize: number) => {
    setPagination((prev) => ({ ...prev, current: page, pageSize }));
  };

  return (
    <div className={styles.teamManagementWrapper}>
      {/* 搜索区域 */}
      <Card className={styles.searchCard} size="small">
        <Form form={searchForm} layout="inline">
          <Form.Item name="name" label="团队名称">
            <Input placeholder="请输入团队名称" allowClear />
          </Form.Item>
          <Form.Item>
            <Space>
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
          </Form.Item>
        </Form>
      </Card>

      {/* 团队列表 */}
      <Card className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadTeamData}>
              刷新
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={teamData}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ x: 1000 }}
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

      {/* 团队成员管理模态框 */}
      <Modal
        title={`${currentTeam?.name || ''} - 成员管理`}
        open={memberModalVisible}
        onCancel={() => setMemberModalVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setMemberModalVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        {currentTeam && (
          <div>
            <Descriptions
              className={styles.teamInfo}
              column={2}
              bordered
              size="small"
            >
              <Descriptions.Item label="团队名称">
                {currentTeam.name}
              </Descriptions.Item>
              <Descriptions.Item label="负责人">
                {currentTeam.ownerName}
              </Descriptions.Item>
            </Descriptions>

            <div className={styles.memberToolbar}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddMember}
                disabled={availableUsers.length === 0}
              >
                添加成员
              </Button>
            </div>

            <Table
              columns={memberColumns}
              dataSource={teamMembers}
              rowKey="userId"
              loading={memberLoading}
              pagination={false}
              size="small"
              locale={{
                emptyText: <Empty description="暂无成员数据" />,
              }}
            />
          </div>
        )}
      </Modal>

      {/* 添加成员模态框 */}
      <Modal
        title="添加团队成员"
        open={addMemberModalVisible}
        onOk={handleAddMemberSubmit}
        onCancel={() => setAddMemberModalVisible(false)}
        confirmLoading={loading}
        destroyOnClose
      >
        <Form form={addMemberForm} layout="vertical">
          <Form.Item
            name="userId"
            label="选择用户"
            rules={[{ required: true, message: '请选择用户' }]}
          >
            <Select
              placeholder={
                availableUsers.length > 0
                  ? '请选择用户'
                  : '(当前无可添加的用户)'
              }
              disabled={availableUsers.length === 0}
              loading={userLoading}
            >
              {availableUsers.map((user) => (
                <Option key={user.id} value={user.id}>
                  {user.username}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="role"
            label="角色"
            initialValue="normal"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Radio.Group>
              <Radio value="normal">普通成员</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TeamManagementPage;
