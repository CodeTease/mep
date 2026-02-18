# Date & Time Prompts

Mep offers a rich set of prompts for handling temporal data, from simple date pickers to complex scheduling interfaces.

## Date

The `date` prompt is a standard date picker.

```typescript
const birthday = await MepCLI.date({
    message: 'When is your birthday?',
    initial: new Date(2000, 0, 1),
    min: new Date(1900, 0, 1), // Earliest allowed date
    max: new Date() // Latest allowed date (today)
});
```

## Time

The `time` prompt allows selecting a time of day (HH:MM AM/PM).

```typescript
const alarm = await MepCLI.time({
    message: 'Set Alarm',
    initial: '07:00 AM',
    interval: 15 // Step interval in minutes
});
```

## Calendar

The `calendar` prompt provides a visual month-view calendar for selecting single dates or ranges.

```typescript
// Single Date Selection
const appointment = await MepCLI.calendar({
    message: 'Select Appointment Date',
    initial: new Date()
});

// Date Range Selection
const vacation = await MepCLI.calendar({
    message: 'Select Vacation Period',
    mode: 'range' // Enable range selection
});
// Returns: [StartDate, EndDate]
```

## Schedule

The `schedule` prompt is a Gantt-chart style interface for planning tasks over a timeline.

```typescript
const plan = await MepCLI.schedule({
    message: 'Plan your day',
    startHour: 8,
    endHour: 18,
    tasks: [
        { id: 1, name: 'Meeting', start: 9, duration: 1 },
        { id: 2, name: 'Coding', start: 10, duration: 3 }
    ]
});
```

## Cron

The `cron` prompt helps users build valid cron expressions interactively or by validation.

```typescript
const jobSchedule = await MepCLI.cron({
    message: 'Configure backup schedule',
    initial: '0 0 * * *', // Daily at midnight
    placeholder: 'Write a cron expression...'
});
```

## Related

- [Rich UI Prompts](./rich-ui.md)
- [Event Handling](../features/events.md)
