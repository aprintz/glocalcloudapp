import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AnErrorOccurred } from '@strapi/helper-plugin';
import pluginId from '../../pluginId';

const HomePage = React.lazy(() => import('../HomePage'));

const App = () => {
  return (
    <div>
      <Routes>
        <Route path={`/plugins/${pluginId}`} element={<HomePage />} />
        <Route path="" element={<AnErrorOccurred />} />
      </Routes>
    </div>
  );
};

export default App;