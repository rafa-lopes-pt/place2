interface LeanProject {
    'Project ID': string;
    'Project Name': string;
    Status: string;
    Owner: string;
    'Start Date': string;
    'End Date': string;
    'Hard Cost Savings': number;
    'Soft Cost Savings': number;
    'Cycle Time Reduction (%)': number;
    'Waste Eliminated': string;
    'Quality Improvement (%)': number;
    'Team Size': number;
    Priority: string;
}
/**
 * Generates sample CSV with n rows
 */
declare function generateSampleProjectsCSV(rowCount: number): string;

interface ProjectMetric {
    'Project ID': string;
    'Metric Date': string;
    Milestone: string;
    'Completion %': number;
    'Team Morale Score': number;
    'Defect Rate': number;
    'Customer Satisfaction': number;
    'Budget Utilization %': number;
    'Resource Availability %': number;
    'Risk Level': string;
    'Stakeholder Engagement': number;
    'Training Hours': number;
    'Process Adherence %': number;
}
/**
 * Generates sample metrics CSV that correlates with project data
 */
declare function generateSampleMetricsCSV(projectsData: Array<{
    projectId: string;
    startDate: string;
    endDate: string;
    status: string;
}>): string;

/**
 * Converts project data to CSV string using PapaParse
 */
declare function dataToCSV(data: unknown[]): string;
/**
 * Downloads CSV file in the browser with CSP-compatible fallback
 * Tries blob URL first, falls back to data URL for SharePoint compatibility
 */
declare function downloadCSV(csvContent: string, filename?: string): void;
/**
 * Parses CSV string to array of objects using PapaParse
 */
declare function parseCSV<T = LeanProject>(csvContent: string): Promise<T[]>;
/**
 * Fetches and parses CSV from URL
 */
declare function fetchAndParseCSV<T = LeanProject>(url: string): Promise<T[]>;
/**
 * Opens a file dialog to select and parse a CSV file from the user's computer
 * @param accept - File types to accept (default: '.csv')
 * @returns Promise that resolves with parsed CSV data
 */
declare function loadCSVFromFile<T = LeanProject>(accept?: string): Promise<T[]>;

interface PerformanceAnalysis {
    'Project ID': string;
    'Project Name': string;
    'Overall Score': number;
    'Savings vs Target': string;
    'Quality Achievement': string;
    'Timeline Performance': string;
    'Team Morale Trend': string;
    'Recommendation': string;
}
interface RiskAnalysis {
    'Project ID': string;
    'Project Name': string;
    'Current Risk Level': string;
    'Risk Trend': string;
    'Defect Rate Correlation': number;
    'Budget Risk': string;
    'Mitigation Priority': string;
}
interface TeamEfficiencyAnalysis {
    'Project ID': string;
    'Project Name': string;
    'Team Size': number;
    'Avg Morale Score': number;
    'Training Hours per Person': number;
    'Process Adherence': number;
    'Efficiency Rating': string;
    'Improvement Areas': string;
}
interface BudgetAnalysis {
    'Project ID': string;
    'Project Name': string;
    'Total Savings': number;
    'Avg Budget Utilization': number;
    'ROI Estimate': string;
    'Cost Efficiency': string;
    'Financial Health': string;
}
/**
 * Analyzes overall project performance by correlating projects with metrics
 */
declare function analyzeProjectPerformance(projects: LeanProject[], metrics: ProjectMetric[]): PerformanceAnalysis[];
/**
 * Analyzes risk factors and correlations
 */
declare function analyzeRiskCorrelation(projects: LeanProject[], metrics: ProjectMetric[]): RiskAnalysis[];
/**
 * Analyzes team efficiency metrics
 */
declare function analyzeTeamEfficiency(projects: LeanProject[], metrics: ProjectMetric[]): TeamEfficiencyAnalysis[];
/**
 * Analyzes budget and financial trends
 */
declare function analyzeBudgetTrends(projects: LeanProject[], metrics: ProjectMetric[]): BudgetAnalysis[];

/**
 * Performs all analyses and returns results
 */
declare function performAllAnalyses(projects: LeanProject[], metrics: ProjectMetric[]): {
    performance: PerformanceAnalysis[];
    risk: RiskAnalysis[];
    teamEfficiency: TeamEfficiencyAnalysis[];
    budget: BudgetAnalysis[];
};
/**
 * Performs all analyses and generates downloadable CSV files
 */
declare function analyzeAndDownload(projects: LeanProject[], metrics: ProjectMetric[]): void;

export { analyzeAndDownload, analyzeBudgetTrends, analyzeProjectPerformance, analyzeRiskCorrelation, analyzeTeamEfficiency, dataToCSV, downloadCSV, fetchAndParseCSV, generateSampleMetricsCSV, generateSampleProjectsCSV, loadCSVFromFile, parseCSV, performAllAnalyses };
export type { BudgetAnalysis, LeanProject, PerformanceAnalysis, ProjectMetric, RiskAnalysis, TeamEfficiencyAnalysis };
