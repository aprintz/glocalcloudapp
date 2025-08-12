import React from 'react';
import {
  Layout,
  BaseHeaderLayout,
  ContentLayout,
  Box,
  Typography,
  Button,
  EmptyStateLayout,
} from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import { Helmet } from 'react-helmet';

const HomePage = () => {
  return (
    <Layout>
      <Helmet title="Geofences" />
      <BaseHeaderLayout
        title="Geofences"
        subtitle="Manage geographic boundaries and location-based notifications"
        as="h1"
        primaryAction={
          <Button startIcon={<Plus />} size="L">
            Create Geofence
          </Button>
        }
      />
      <ContentLayout>
        <Box padding={8}>
          <EmptyStateLayout
            icon={<div>🌍</div>}
            content="No geofences created yet. Create your first geofence to start managing location-based notifications."
            action={
              <Button variant="secondary" startIcon={<Plus />}>
                Create your first geofence
              </Button>
            }
          />
        </Box>
      </ContentLayout>
    </Layout>
  );
};

export default HomePage;