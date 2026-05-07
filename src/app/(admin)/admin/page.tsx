import { ShoppingBag, Package, Users, TrendingUp, ArrowUpRight, Eye, Clock } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

const STATS = [
  { icon: TrendingUp, label: 'Total Revenue', value: formatPrice(245800), change: '+12.5%', up: true, color: 'bg-primary-bg text-primary' },
  { icon: ShoppingBag, label: 'Total Orders', value: '1,284', change: '+8.2%', up: true, color: 'bg-blue-50 text-blue-600' },
  { icon: Package, label: 'Products', value: '248', change: '+3 new', up: true, color: 'bg-orange-50 text-orange-600' },
  { icon: Users, label: 'Customers', value: '2,412', change: '+15.3%', up: true, color: 'bg-purple-50 text-purple-600' },
]

const RECENT_ORDERS = [
  { id: '#4LHV8CX', customer: 'Rohan Sharma', product: 'AirPods Pro', amount: 6800, status: 'DELIVERED', date: '2 hrs ago' },
  { id: '#4LHV7SW', customer: 'Priya Thapa', product: 'Vitamin C Serum', amount: 1800, status: 'PROCESSING', date: '4 hrs ago' },
  { id: '#4LHV6OE', customer: 'Aarav Poudel', product: 'Smart Watch X', amount: 12000, status: 'CONFIRMED', date: '6 hrs ago' },
  { id: '#4LHV5TR', customer: 'Nisha KC', product: 'CeraVe Cleanser', amount: 980, status: 'PENDING', date: '8 hrs ago' },
  { id: '#4LHV4YB', customer: 'Dipesh Karki', product: 'RGB Keyboard', amount: 3800, status: 'SHIPPED', date: '10 hrs ago' },
]

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-purple-100 text-purple-700',
  SHIPPED: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

const TOP_PRODUCTS = [
  { name: 'AirPods Pro Clone', sales: 142, revenue: 965600, img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=60&h=60&fit=crop' },
  { name: 'Smart Watch X', sales: 89, revenue: 1068000, img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=60&h=60&fit=crop' },
  { name: 'CeraVe Cleanser', sales: 234, revenue: 229320, img: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=60&h=60&fit=crop' },
  { name: 'Vitamin C Serum', sales: 178, revenue: 320400, img: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=60&h=60&fit=crop' },
]

export default function AdminDashboard() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading font-extrabold text-3xl text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back! Here&apos;s what&apos;s happening.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-2 rounded-xl border border-gray-200">
          <Clock size={15} />
          Last 30 days
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {STATS.map(({ icon: Icon, label, value, change, up, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
                <Icon size={18} />
              </div>
              <span className={`flex items-center gap-1 text-xs font-bold ${up ? 'text-green-600' : 'text-red-500'}`}>
                <ArrowUpRight size={13} />
                {change}
              </span>
            </div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
            <p className="font-heading font-extrabold text-2xl text-gray-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
            <h2 className="font-heading font-bold text-gray-900">Recent Orders</h2>
            <a href="/admin/orders" className="flex items-center gap-1 text-xs text-primary font-bold hover:underline cursor-pointer">
              View all <ArrowUpRight size={12} />
            </a>
          </div>
          <div className="divide-y divide-gray-50">
            {RECENT_ORDERS.map(order => (
              <div key={order.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900">{order.id}</p>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${STATUS_COLORS[order.status]}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{order.customer} · {order.product}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm text-gray-900">{formatPrice(order.amount)}</p>
                  <div className="flex items-center justify-end gap-1 text-xs text-gray-400 mt-0.5">
                    <Clock size={11} />
                    {order.date}
                  </div>
                </div>
                <button className="p-1.5 text-gray-300 hover:text-primary transition-colors cursor-pointer">
                  <Eye size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
            <h2 className="font-heading font-bold text-gray-900">Top Products</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {TOP_PRODUCTS.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3 px-5 py-4">
                <span className="text-sm font-extrabold text-gray-300 w-4">{i + 1}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.img} alt={p.name} className="w-10 h-10 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">{p.name}</p>
                  <p className="text-[11px] text-gray-400">{p.sales} sold</p>
                </div>
                <p className="text-xs font-bold text-gray-900 shrink-0">{formatPrice(p.revenue)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
