import ChessDashboard from './ChessDashboard';
import StorageErrorListener from './components/StorageErrorListener';

function App() {
  return (
    <>
      <StorageErrorListener />
      <ChessDashboard />
    </>
  );
}

export default App;
