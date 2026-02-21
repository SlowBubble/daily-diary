
# m2b
- In stats, also add
  - a frequency histogram showing the number of words in each entry (max 10 words).
  - a frequency histogram of the most common word among the entries (just do top 10 words).
# m2a
- In the view mode, if the user press "s", take the user to the stats page.
- Create a stats.html page
  - Display a line chart where x-axis is the date (based on the timestamp number, but just marked the x-axis the start of each day) and y-axis is the cumulative number of entries.

# m1d
- In view mode, when pressing space to utter the entry, also add:
  - when the utterance finish, select the next entry.

# m1c
Internally, let's have 3 modes
- New mode, which is the current mode for creating new posts
- View mode, which removes the right panel, but still display the entries
  - This mode is entered when user press "Esc" from the other modes
  - In this mode, the user can navigate through the entries using the arrow keys, with the top entry being selected, (or the same entry that was selected when the user entered the view mode if it was in edit mode)
- Edit mode, which allows editing of a specific entry
  - This mode is entered when user press "Enter" from the view mode, in which case it will open up a textarea like the new mode but with the entry's text pre-filled.
  - All the other textarea functionalities should be the same as the new mode
    - When the user press "Enter" from the edit mode, it should save the entry and return to the view mode, with the same entry selected.

# m1b
- Use speech synthesis to read a word when the user enter a space
  - Also read the word when the user type a punctuation mark, but then don't read it again when the user press space
- Read the whole entry when the user press "enter"

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