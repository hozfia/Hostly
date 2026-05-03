import { Provider as ReduxProvider } from "react-redux";
import { store } from "./store";
import MainLayout from "./layouts/MainLayout";
import { Provider } from "@react-spectrum/s2";
import "./App.css";
import "@react-spectrum/s2/page.css";

function App() {
  return (
    <ReduxProvider store={store}>
      {/* <Provider background="base" colorScheme="dark"> */}
      <Provider background="base">
        <MainLayout />
      </Provider>
    </ReduxProvider>
  );
}

export default App;