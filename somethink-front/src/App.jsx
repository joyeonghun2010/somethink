import {BrowserRouter, Routes, Route, Navigate} from "react-router-dom";

import Login from "./pages/login";
import Signup from "./pages/signup";
import Main from "./pages/main";

function App() {
    return (
        <BrowserRouter>

            <Routes>

                <Route path="/" element={<Navigate to="/main" />} />

                <Route path="/login" element={<Login />} />

                <Route path="/signup" element={<Signup />} />

                <Route path="/main" element={<Main />} />


            </Routes>

        </BrowserRouter>
    );
}

export default App;