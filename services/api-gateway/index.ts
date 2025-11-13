import express, { type Request, type Response } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());


app.use(
  "/api/v1/auth",
  createProxyMiddleware({
    target: process.env.USER_SERVICE_URL || "http://user-service:4001",
    changeOrigin: true,
    // Add back the /api/v1/auth prefix that was stripped
    pathRewrite: function (path, req) {
      // path is already stripped (e.g., "/create"), so add prefix back
      return '/api/v1/auth' + path;
    },
    on: {
      proxyReq: (proxyReq: any, req: Request, res: Response) => {
        // Use the raw body that was buffered
        const rawBody = (req as any).rawBody;
        if (rawBody) {
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(rawBody));
          proxyReq.write(rawBody);
        }
      },
    },
    logger: console,
  })
);

// Future: Product, Order, Payment, etc.
// app.use("/api/v1/products", createProxyMiddleware({ target: process.env.PRODUCT_SERVICE_URL, changeOrigin: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
