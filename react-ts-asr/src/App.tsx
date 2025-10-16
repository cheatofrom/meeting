import { ConfigProvider, App as AntdApp } from 'antd'
import ASRComponent from './components/ASRComponent'
import './App.css'

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
        },
      }}
    >
      <AntdApp>
        <div className="app-container">
          <ASRComponent 
          defaultServerUrl="wss://192.168.1.66/ws/" />
        </div>
      </AntdApp>
    </ConfigProvider>
  )
}

export default App
