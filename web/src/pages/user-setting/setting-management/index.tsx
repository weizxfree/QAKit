import { useTranslate } from '@/hooks/common-hooks';
import {
  DatabaseOutlined,
  FileOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Layout, Typography } from 'antd';
import React from 'react';
import { Outlet, useLocation, useNavigate } from 'umi';
import styles from './index.less';

const { Title, Paragraph } = Typography;
const { Sider, Content } = Layout;

const UserSettingManagement = () => {
  const { t } = useTranslate('setting');
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: 'user-management',
      icon: <UserOutlined />,
      label: '用户管理',
      path: '/user-setting/management/user-management',
    },
    {
      key: 'team-management',
      icon: <TeamOutlined />,
      label: '团队管理',
      path: '/user-setting/management/team-management',
    },
    {
      key: 'file-management',
      icon: <FileOutlined />,
      label: '文件管理',
      path: '/user-setting/management/file-management',
    },
    {
      key: 'knowledge-management',
      icon: <DatabaseOutlined />,
      label: '知识库管理',
      path: '/user-setting/management/knowledge-management',
    },
    {
      key: 'user-config',
      icon: <SettingOutlined />,
      label: '用户配置',
      path: '/user-setting/management/user-config',
    },
  ];

  const handleMenuClick = (path: string) => {
    navigate(path);
  };

  // 获取当前活跃的菜单项
  const getActiveKey = () => {
    const currentPath = location.pathname;
    const activeItem = menuItems.find((item) => currentPath.includes(item.key));
    return activeItem?.key || 'user-management';
  };

  // 如果是根路径，默认跳转到用户管理
  React.useEffect(() => {
    if (location.pathname === '/user-setting/management') {
      navigate('/user-setting/management/user-management');
    }
  }, [location.pathname, navigate]);

  return (
    <div className={styles.managementWrapper}>
      <div className={styles.managementHeader}>
        <Title level={3}>{t('management')}</Title>
        <Paragraph>
          {t('managementDescription', '系统管理功能，仅超级管理员可见。')}
        </Paragraph>
      </div>
      <Layout className={styles.managementLayout}>
        <Sider width={200} className={styles.managementSider} theme="light">
          <div className={styles.menuWrapper}>
            {menuItems.map((item) => (
              <div
                key={item.key}
                className={`${styles.menuItem} ${getActiveKey() === item.key ? styles.menuItemActive : ''}`}
                onClick={() => handleMenuClick(item.path)}
              >
                <span className={styles.menuIcon}>{item.icon}</span>
                <span className={styles.menuLabel}>{item.label}</span>
              </div>
            ))}
          </div>
        </Sider>
        <Content className={styles.managementContent}>
          <Outlet />
        </Content>
      </Layout>
    </div>
  );
};

export default UserSettingManagement;
