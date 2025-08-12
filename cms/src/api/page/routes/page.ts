export default {
  routes: [
    {
      method: 'GET',
      path: '/pages',
  handler: 'page.find',
  config: { policies: [] }
    },
    {
      method: 'GET',
      path: '/pages/:id',
  handler: 'page.findOne',
  config: { policies: [] }
    }
  ]
};
