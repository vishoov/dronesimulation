# Drone Simulation App 🚁🌍

## Project Description

Welcome to the **Drone Simulation App**! 🎉 This web-based application lets you simulate your drone's journey on a map. With features to add multiple destinations, control the simulation, and visualize real-time movement, it's perfect for exploring drone paths and flight dynamics. 📍✨

Check out the live app here: [Drone Simulation App](https://dronesimulation-seven.vercel.app/) 🌐

## Functionalities

- **Add and Manage Destinations** 🌍📍:
  - Input multiple destination points with latitude, longitude, and travel time. 
  - Dynamically add ➕ or remove ➖ destinations. 

- **Simulate Drone Movement** 🚁:
  - Start the simulation from your input coordinates. 🌐
  - Watch the drone’s path unfold on Google Maps in real-time. 🗺️
  - Get continuous updates on the drone’s position as it moves. 🔄

- **Control Simulation** 🎛️:
  - **Pause** ⏸️: Stop the simulation whenever needed.
  - **Resume** ▶️: Continue from where it was paused.
  - **Reset** 🔄: Restart the simulation with initial settings.
  - **Seek** ⏩: Jump to any point in the simulation using a progress bar. 📊

- **Metrics Display** 📈:
  - Show total distance covered in kilometers. 📏
  - Display elapsed time in seconds. ⏱️

## Tech Stack

- **Frontend**: 
  - Angular 🅰️
  - Angular Material 🎨
  - Google Maps API 🗺️

- **Styling**:
  - SCSS 🎨

- **Utilities**:
  - RxJS 🧩

## Approach

1. **Form Management** 📋:
   - Use Angular Reactive Forms to handle user inputs for the drone simulation.
   - Ensure accurate data entry with validations for latitude, longitude, and time. ✅

2. **Simulation Logic** 🧮:
   - Calculate drone movement based on user-defined destinations and times.
   - Update the drone’s position periodically using RxJS `interval`. ⏲️

3. **Map Integration** 🌐:
   - Integrate Google Maps for visualizing the drone’s path and markers. 📍
   - Update markers and polyline to reflect the drone’s current location. 🗺️

4. **Control Mechanisms** 🛠️:
   - Implement pause ⏸️, resume ▶️, and reset 🔄 functionalities to manage the simulation.
   - Add a progress bar 📊 to seek specific points in the simulation. ⏩

5. **Distance Calculation** 📏:
   - Calculate and display the distance covered by the drone in real-time using Google Maps geometry services. 🗺️

Feel free to explore, contribute, and provide feedback! Your input is highly valued. 🚀💬
