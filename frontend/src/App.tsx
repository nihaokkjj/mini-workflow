import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppListPage from "./pages/AppListPage";
import AppEditorPage from "./pages/AppEditorPage";
import ChatPage from "./pages/ChatPage";
import ProjectGuidePage from "./pages/ProjectGuidePage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppListPage />} />
        <Route path="/guide" element={<ProjectGuidePage />} />
        <Route path="/app/:appId" element={<AppEditorPage />} />
        <Route path="/app/:appId/chat" element={<ChatPage />} />
      </Routes>
    </BrowserRouter>
  );
}
