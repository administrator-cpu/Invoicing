import NodeCache from 'node-cache';
import catchAsync from '../../utils/catchAsync.js';
import {
  searchCrmCustomers,
  getCrmCustomerDetails,
  getCrmCustomerConnections,
  getCrmDashboardConnections
} from '../../services/crm.service.js';

const cache = new NodeCache({ stdTTL: 300, checkperiod: 320 });

export const searchCustomers = catchAsync(async (req, res, next) => {
  const { search = '', page = 1, limit = 15, sort = 'recent' } = req.query;

  const cacheKey = `customers_search_${search}_${page}_${limit}_${sort}`;

  if (cache.has(cacheKey)) {
    return res.status(200).json({
      status: 'success',
      source: 'cache',
      data: cache.get(cacheKey)
    });
  }

  const result = await searchCrmCustomers(search, page, limit, sort);
  const customers = result.customers;
  const customersWithConnections = await Promise.all(customers.map(async customer => {
    const customerId = customer._id || customer.id;
    try {
      const connections = await getCrmDashboardConnections(customerId);
      return {
        ...customer,
        connectionCount: connections.count || 0,
        connections: connections.connections || []
      };
    } catch (err) {
      console.error(`Connection fetch failed for ${customerId}`, err);

      return {
        ...customer,
        connectionCount: 0,
        connections: []
      };
    }
  }));

  const payload = {
    customers: customersWithConnections,
    pagination: result.pagination
  };
  cache.set(cacheKey, payload);

  res.status(200).json({
    status: 'success',
    source: 'api',
    data: payload
  });
});

export const getAllCustomers = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 50 } = req.query;

  const cacheKey = `customers_all_${page}_${limit}`;

  if (cache.has(cacheKey)) {
    return res.status(200).json({
      status: 'success',
      source: 'cache',
      data: cache.get(cacheKey)
    });
  }

  const result = await searchCrmCustomers('', page, limit);
  cache.set(cacheKey, result);

  res.status(200).json({
    status: 'success',
    source: 'api',
    data: result
  });
});

export const getCustomerData = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const cacheKey = `customer_data_${id}`;

  if (cache.has(cacheKey)) {
    return res.status(200).json({
      status: 'success',
      source: 'cache',
      data: cache.get(cacheKey)
    });
  }

  const [customer, connections] = await Promise.all([
    getCrmCustomerDetails(id),
    getCrmCustomerConnections(id)
  ]);

  const payload = { customer, connections };
  cache.set(cacheKey, payload);

  res.status(200).json({
    status: 'success',
    source: 'api',
    data: payload
  });
});