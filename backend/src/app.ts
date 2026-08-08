import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes';
import customerRoutes from './modules/customers/customers.routes';
import productRoutes from './modules/products/products.routes';
import challanRoutes from './modules/challans/challans.routes';
import { errorHandler } from './middleware/error';

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/challans', challanRoutes);

// Fallback Not Found Route
app.use((req, res, next) => {
  res.status(404).json({
    error: {
      message: `Cannot ${req.method} ${req.url}`,
      code: 'NOT_FOUND',
    },
  });
});

// Centralized Error Handler
app.use(errorHandler);

export default app;
