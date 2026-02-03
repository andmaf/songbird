// Bird Log - Demo Data Generator
// Generates realistic simulated IMU data for testing without hardware

function generateDemoData() {
    const minutes = [];
    const totalMinutes = 720; // 12 hours of data

    // Activity patterns throughout the day (6am - 6pm)
    // Higher values = more activity
    const activityCurve = (minute) => {
        const hour = minute / 60;

        // Morning burst (7-9am)
        if (hour >= 1 && hour <= 3) return 0.8;

        // Midday activity (11am-1pm)
        if (hour >= 5 && hour <= 7) return 0.6;

        // Afternoon calm (2-4pm)
        if (hour >= 8 && hour <= 10) return 0.3;

        // Evening activity (5-6pm)
        if (hour >= 11) return 0.5;

        // Default moderate
        return 0.4;
    };

    let totalSteps = 0;
    let activeMinutes = 0;
    let totalFidgets = 0;

    for (let t = 0; t < totalMinutes; t++) {
        const activity = activityCurve(t);
        const randomFactor = 0.5 + Math.random();

        // Base acceleration (1.0 = at rest, gravity only)
        const avgAcc = 1.0 + activity * randomFactor * 0.5;

        // Max acceleration spikes
        const maxAcc = avgAcc + Math.random() * activity * 2;

        // Rotation (radians per second, usually small)
        const avgRot = (Math.random() - 0.5) * activity * 0.5;

        // Steps - only if active enough
        const steps = activity > 0.4 ? Math.floor(Math.random() * activity * 100) : 0;

        // Fidget events - random small movements
        const fidgetEvents = Math.random() < activity * 0.3
            ? Math.floor(Math.random() * 5)
            : 0;

        minutes.push({
            t,
            avg_acc: Math.round(avgAcc * 100) / 100,
            max_acc: Math.round(maxAcc * 100) / 100,
            avg_rot: Math.round(avgRot * 100) / 100,
            steps,
            fidget_events: fidgetEvents
        });

        totalSteps += steps;
        if (avgAcc > 1.1 || steps > 10) activeMinutes++;
        totalFidgets += fidgetEvents;
    }

    return {
        date: new Date().toISOString().split('T')[0],
        minutes,
        summary: {
            total_steps: totalSteps,
            active_minutes: activeMinutes,
            fidget_events: totalFidgets
        }
    };
}
