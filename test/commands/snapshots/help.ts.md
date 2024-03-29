# Snapshot report for `test/commands/help.ts`

The actual snapshot is saved in `help.ts.snap`.

Generated by [AVA](https://avajs.dev).

## home

> Snapshot 1

    {
      embeds: [
        {
          description: `For a complete command list, use \`help all\`.␊
          Use \`help [page]\` for more indepth help on a specific command.␊
          ␊
          You may also want to read about other features, listed below:␊
          \`\`\`* chaining␊
          * notes\`\`\`␊
          \`{}\` = required. \`[]\` = optional. \`""\` = literal. \`||\` = or.`,
          fields: [
            {
              name: '```remind {description} ["at" [date || weekday] [time]] [{"in" || "every"} {time}]```',
              value: 'Creates a reminder that will be sent in this channel or in DM.',
            },
            {
              name: '```list ["all" || tagName || "!"tagName]```',
              value: 'Lists all reminders, reminders in/outside a tag, or reminders for the current server.',
            },
            {
              name: '```desc {id || \'latest\'} {description}```',
              value: 'Change a reminder description',
            },
            {
              name: '```remove {id || ( "all" [tagName] ) | "latest"}```',
              value: 'Removes a reminder, all reminders, or all reminders in a tag.',
            },
            {
              name: '```tag {id || "all" | "latest"} [tag]```',
              value: 'Tags a reminder. Provide no tag name to remove from a tag.',
            },
            {
              name: '```timezone {timezone}```',
              value: 'Changes your timezone. See <https://en.wikipedia.org/wiki/List_of_tz_database_time_zones>',
            },
            {
              name: '```locale {locale}```',
              value: 'Changes your locale. See <https://github.com/ladjs/i18n-locales>',
            },
          ],
          title: '**Common Commands and Usage**',
        },
      ],
    }
