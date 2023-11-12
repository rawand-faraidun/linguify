import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Header from './components/App/Header'
import AppProvider from './components/context/AppContext'
import { Toaster } from './components/ui/toaster'
import IndexPage from './pages/Index'
import NamespacePage from './pages/Namespace'

function App() {
  return (
    <>
      <AppProvider>
        <BrowserRouter>
          <Header />

          <Routes>
            <Route path="/" element={<IndexPage />} />
            <Route path="/:ns" element={<NamespacePage />} />
          </Routes>

          <Toaster />
        </BrowserRouter>
      </AppProvider>
    </>
  )
}

export default App
