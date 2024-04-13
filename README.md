# d3js-covid19ph
A simple d3.js-based COVID-19 dashboard for the Philippines 🇵🇭.

## 1. Dataset
The datasets are taken from the [DOH](https://doh.gov.ph) COVID-19 data drop. Note that the dataset period ranged from 25 Apr 2020 to 26 Feb 2021. 

## 2. Dashboard
The COVID-19 dashboard comprises two parts: (1) the pane for the **current cases** and (2) the **trends** through time per region.

There are two dropdown menus that allow users to choose between visualizing the actual cases or the cases per 100k population.

## 2.1. Variables considered
The following variables are used in the COVID-19 dashboard:
1. Daily cases
2. Daily deaths
3. Daily recoveries
4. Asymptomatic cases
5. Mild cases
6. Severe cases
7. Critical cases
8. Total cases
9. Total died
10. Total recovered


Asymptomatic, mild, severe, and critical cases are based on [1](https://doh.gov.ph/wp-content/uploads/2023/08/dm2022-0501.pdf) and [2](https://drive.google.com/file/d/1zQwcC4L4Z2KKWXjZ1xjS96JuGa9XrXeq/view).


## 2.2. Current case pane
The pane for the current cases (top part) comprises a scrollable Philippine map that is dissected into its component regions, as well as the "current" COVID-19 case count. As mentioned, users have the ability to view the actual cases or the cases per 100k population.

## 2.3. COVID-19 trends pane
The pane for the per-region COVID-19 trends (bottom part) appears once the user selects a region on the current case pane. 

The COVID-19 trends pane is made up of a combination of a bar graph and a line chart, which respectively represent the _actual_ and _7-day moving average_ COVID-19 cases per region. The user two options to view the pane: (1) zooming between the cases 2 weeks ago, for that month, or the entire dataset duration; or (2) using the sliding window below the pane.


## Questions?
If you have questions about this visualization, feel free to shoot me an email at jprmaulion[at]gmail[dot]com. 🫶🏽
