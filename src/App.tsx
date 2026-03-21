import React from 'react';
import { AppProvider, useAppContext } from './AppContext';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { ConditionScreen } from './screens/ConditionScreen';
import { CourseSelectionScreen } from './screens/CourseSelectionScreen';
import { ProposalScreen } from './screens/ProposalScreen';
import { GeneratorScreen } from './screens/GeneratorScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { GradeInputScreen } from './screens/GradeInputScreen';
import { ReflectionScreen } from './screens/ReflectionScreen';

const ScreenManager: React.FC = () => {
  const { state } = useAppContext();

  switch (state.currentScreen) {
    case 1: return <OnboardingScreen />;
    case 2: return <ConditionScreen />;
    case 3: return <CourseSelectionScreen />;
    case 4: return <ProposalScreen />;
    case 5: return <GeneratorScreen />;
    case 6: return <DashboardScreen />;
    case 7: return <GradeInputScreen />;
    case 8: return <ReflectionScreen />;
    default: return <OnboardingScreen />;
  }
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <ScreenManager />
    </AppProvider>
  );
};

export default App;
