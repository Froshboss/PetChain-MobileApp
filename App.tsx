import React, { useEffect, useState } from 'react';
import * as Sentry from '@sentry/react-native';
import config from './src/config';
import AuthNavigator from './src/screens/AuthNavigator';
import PetListScreen from './src/screens/PetListScreen';
import type { AuthSession } from './src/services/authService';

// Initialize Sentry
Sentry.init({
  dsn: config.sentry.dsn,
  enabled: !config.isDev || config.sentry.enableInDev,
  debug: config.isDev,
  environment: config.env,
  // Release tracking and source maps are handled by Expo/Sentry build-time tools
});

const App = () => {
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    // Global error handler for unhandled promise rejections or other errors
    const defaultHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      Sentry.captureException(error);
      defaultHandler(error, isFatal);
    });
  }, []);

  if (!session) {
    return (
      <AuthNavigator
        onAuthenticated={(newSession) => {
          setSession(newSession);
          // Set user context in Sentry
          Sentry.setUser({
            id: newSession.user.id,
            email: newSession.user.email,
          });
        }}
      />
    );
  }

  return (
    <PetListScreen
      onSelectPet={(pet) => {
        console.log('Selected pet:', pet.name);
        // Navigation logic would go here if using a real navigator
      }}
      onAddPet={() => {
        console.log('Add pet pressed');
        // Navigation logic would go here
      }}
    />
  );
};

export default Sentry.wrap(App);
