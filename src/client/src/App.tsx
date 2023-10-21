import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Header from './components/App/Header'
import AppProvider from './components/context/AppContext'
import IndexPage from './pages/Index'

function App() {
  return (
    <>
      <AppProvider>
        <BrowserRouter>
          <Header />

          <Routes>
            <Route path="/" element={<IndexPage />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </>
  )
}

export default App
