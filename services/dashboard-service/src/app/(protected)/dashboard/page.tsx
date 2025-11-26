import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const metadata = {
  title: 'Dashboard - AJOB4AGENT',
  description: 'Your job application dashboard',
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="px-4 sm:px-0">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {session?.user?.name || 'User'}!
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Here&apos;s an overview of your job application activity.
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Total Applications
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">0</dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Pending
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-yellow-600">0</dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Interviews
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-blue-600">0</dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Offers
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-green-600">0</dd>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
          <div className="mt-4 text-sm text-gray-500 text-center py-8">
            No recent activity. Start your job search to see updates here.
          </div>
        </div>
      </div>
    </div>
  );
}
