import { Layout, theme } from 'antd';
import React from 'react';
import { Outlet } from 'umi';
import '../locales/config';
import Header from './components/header';

import styles from './index.less';

const { Content, Sider } = Layout;

const App: React.FC = () => {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  return (
    <Layout className={styles.layout}>
      <Sider width="60px" className={styles.siderStyle}>
        <Header></Header>
      </Sider>
      <Layout>
        <Content
          style={{
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflow: 'auto',
            display: 'flex',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;
