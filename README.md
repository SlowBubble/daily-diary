
# m1a
- start with index.html
  - it should accept a query param called user_id
    - if not provided, call it Nameless
- 1 panel on the left and 1 panel on the right
- The right panel will be a textarea
  - When the user press "enter", it should save to local storage for the user_id as the key

Storage format should be a serialized JSON:
```
{
  entries: [
    {
      timestamp: "2022-01-01T00:00:00.000Z",
      text: "Hello World."
    }
  ]
}
```

- The left panel will display the entries in reverse chronological order.
  - Start with the header: "${user_id}'s Diary"
  - Then display the date and [Morning|Afternoon|Evening|Night] as a subheader
  - Then display the text.