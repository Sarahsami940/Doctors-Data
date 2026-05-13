// Test the backend API directly on port 3001
const testKpi = async (kpi) => {
    console.log(`Testing KPI: ${kpi}`);
    try {
        const url = `http://localhost:3001/api/doctors?kpi=${kpi}`;
        const response = await fetch(url);
        const data = await response.json();
        const total = (data.pagination && data.pagination.total) || 0;
        console.log(`Results for ${kpi}: total according to pagination: ${total}`);
    } catch (err) {
        console.log(`Error testing ${kpi}: ${err.message}`);
    }
};

const runTests = async () => {
    await testKpi('all');
    await testKpi('no-locations');
    await testKpi('single-location');
    await testKpi('multi-locations');
};

runTests();
