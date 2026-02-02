import { redirect } from 'next/navigation';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'VaxTrace Nigeria - Home',
  description: 'Vaccine Supply Chain Analytics Dashboard for Nigeria',
};

export default function HomePage() {
  // Redirect to login if not authenticated, or to dashboard if authenticated
  // In a real app, this would check session cookies
  redirect('/login');
}
