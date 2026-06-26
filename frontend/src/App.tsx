import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppListPage from "./pages/AppListPage";
import AppEditorPage from "./pages/AppEditorPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppListPage />} />
        <Route path="/app/:appId" element={<AppEditorPage />} />
      </Routes>
    </BrowserRouter>
  );
}
