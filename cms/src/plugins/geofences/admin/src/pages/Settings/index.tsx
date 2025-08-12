import React from 'react';
import {
  Layout,
  BaseHeaderLayout,
  ContentLayout,
  Box,
  Typography,
} from '@strapi/design-system';
import { Helmet } from 'react-helmet';

const Settings = () => {
  return (
    <Layout>
      <Helmet title="Geofences Settings" />
      <BaseHeaderLayout
        title="Geofences Settings"
        subtitle="Configure geofence evaluation and notification settings"
        as="h1"
      />
      <ContentLayout>
        <Box padding={8}>
          <Typography variant="beta">
            Settings for geofence evaluation intervals, notification preferences, and admin access controls.
          </Typography>
          <Box paddingTop={4}>
            <Typography variant="omega">
              Settings panel coming soon...
            </Typography>
          </Box>
        </Box>
      </ContentLayout>
    </Layout>
  );
};

export default Settings;