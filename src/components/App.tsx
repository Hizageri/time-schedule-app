import React from 'react';
import { AppProvider, useAppContext } from '../logic/AppContext';
import { OnboardingScreen } from '../pages/OnboardingScreen';
import { ConditionScreen } from '../pages/ConditionScreen';
import { CourseSelectionScreen } from '../pages/CourseSelectionScreen';
import { ProposalScreen } from '../pages/ProposalScreen';
import { GeneratorScreen } from '../pages/GeneratorScreen';
import { DashboardScreen } from '../pages/DashboardScreen';
import { GradeInputScreen } from '../pages/GradeInputScreen';
import { ReflectionScreen } from '../pages/ReflectionScreen';

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
