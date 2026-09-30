import React, { useEffect } from 'react';
import { useWidgetStore } from './hooks/useWidgetStore';
import { Canvas } from './components/Canvas';

export const App: React.FC = () => {
  const init = useWidgetStore(s => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return <Canvas />;
};

export default App;
