import MainLayout from "./layouts/MainLayout";
import { Provider } from "@react-spectrum/s2";
import "./App.css";
import "@react-spectrum/s2/page.css";

function App() {
  return (
    <Provider background="base">
      <MainLayout />
    </Provider>
  );
}

export default App;