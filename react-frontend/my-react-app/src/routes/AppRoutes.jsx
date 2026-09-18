import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ForgotPassword from '../pages/ForgotPassword/forgot-password.jsx'
import SignupPage from '../pages/SignupPage/SignupPage.jsx'
import Home from '../pages/Home/Home.jsx'
import Page404 from '../pages/NotFound/404.jsx'

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/404" element={<Page404 />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes