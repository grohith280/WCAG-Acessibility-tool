function prioritizeIssues(issues) {
    return issues.sort((a, b) => b.severity - a.severity);
}