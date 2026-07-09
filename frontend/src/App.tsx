import { ErrorBoundary } from "./components/ErrorBoundary";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppListPage from "./pages/AppListPage";
import AppEditorPage from "./pages/AppEditorPage";
import ChatPage from "./pages/ChatPage";
import DatasetManagementPage from "./pages/DatasetManagementPage";
import LoginPage from "./pages/LoginPage";
import ProjectGuidePage from "./pages/ProjectGuidePage";

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<AppListPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/guide" element={<ProjectGuidePage />} />
          <Route path="/datasets" element={<DatasetManagementPage />} />
          <Route path="/app/:appId" element={<AppEditorPage />} />
          <Route path="/app/:appId/chat" element={<ChatPage />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
