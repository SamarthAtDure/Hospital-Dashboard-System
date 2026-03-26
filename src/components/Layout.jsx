// import Sidebar from "./Sidebar";
// import Navbar from "./Navbar";
import Sidebar from "@components/Sidebar";
import Navbar from "@components/Navbar";

function Layout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 text-slate-900">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <Navbar />
        <div className="flex-1 overflow-y-auto p-7">{children}</div>
      </div>
    </div>
  );
}

export default Layout;
