import React from 'react';
import { AppProvider } from './context/AppContext';
import AppNavigator from './navigation/AppNavigator';

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppNavigator />
    </AppProvider>
  );
};

export default App;