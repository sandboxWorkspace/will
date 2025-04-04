# [SEOP Digital Hub](https://sandboxworkspace.github.io/will/)
### Developer: Wilbert Liu *[(Personal Site tbd)](https://example.com/)*

A mobile-first web app aiming to streamline operations and digitize workflows by serving as a centralized platform for inventory management, maintenance requests, and resource reservations. The primary goal is to enhance efficiency, reduce redundancy, and improve communication via increased accessibility and visibility.

Keeping scalability in mind, this should allow for future expansion and ideas/suggestions are welcome!

Live Feature List:
- Inventory Requests and Tracking
- Maintenance Requests and Tracking

Currently working on:
``
Migrating away from google forms/sheets
``

## Pending Ideas and ToDo List

Create:
- Pitchdeck
- Visual User Guide
- FAQ and suggestion(s) form

Migrate to firebase (refactor for any database):
- Inventory, Maintenance, both Trackers 

Inventory:
- Autocomplete livesearch typeahead with default add ins (requester name, item name, location, etc...)
- Database tag items and sort (PerformanceHealth minimum order quantity)
- Complete form logic overhaul for dynamic table:
    - Allow multiple items to be requested async
    - Request location (e.g. gym, eval room, backstock, etc...)
    - Add thresholds for minimum quantity
    - Differentiate room restock vs reorder options
    - Option for new item requests
    - 
- Submissions: data collection, analysis, and prediction
- Migrate from google apps script email function

Refractor Todo list:
- Refactor code to allow transitioning away from Google firebase realtime database (general SQL database e.g. Mongo) 
- Refractor javascript files so that functions are modular and seprate services instead of jumbled all together

Maintenance:
- Add *optional* urgency option (e.g. concern, can wait, immediate, etc...)

Reservation System:
- Equipment reservation table (FES Bike & Xcite)
- Tech reservation

Submission Trackers:
- Increase visibility
- Add logic to prevent repeated requests

## Setup instructions

Note to self: refer to ``code ~/.bash_history ``

```
git clone https://github.com/sandboxWorkspace/will
npm --version
    11.2.0
node --version
    v22.14.0
npm install
npx vite
npm run dev
npm run build
npm run serve
```


Publish instructions

```
git checkout main
npm run build
mkdir ../temp_gh_pages
cp -r dist/* ../temp_gh_pages/
git checkout gh-pages
rm -rf *
cp -r ../temp_gh_pages/* .
git add .
git commit -m "Deploy to gh-pages"
git push origin gh-pages
rm -rf ../temp_gh_pages
git checkout main
```