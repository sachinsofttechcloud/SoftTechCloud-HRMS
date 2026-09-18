import DashboardOverview from "./component/dashboard";

export const metadata = {
  title: "Employee Dashboard | SoftTechCloud HRMS",
  description: "SoftTechCloud HRMS Employee Workspace and Portal.",
};

export default function Homepage() {
  return <DashboardOverview />;
}