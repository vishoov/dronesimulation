import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, interval, Subscription } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
totalDistance: string|number = 0;
averageSpeed: string|number = 0;
elapsedTime: string|number = 0;

  title: string = 'Drone Simulation';
  G_API_KEY: string = environment.G_API_KEY;
  G_MAP_API: string = `https://maps.googleapis.com/maps/api/js?key=${this.G_API_KEY}&libraries=geometry`;
  MARKER_ICON: string = 'assets/drone.png';

  latLngForm: FormGroup;
  private droneUpdateSubscription: Subscription = new Subscription();
  apiLoaded: Observable<boolean>;

  simulatePaused: boolean = false;
  progressCount: number = 0;
  numSteps: number = 100; // Number of intermediate positions
  time: number = 0; // in milliseconds

  positionA: google.maps.LatLngLiteral = {
    lat: 28.522308592619723,
    lng: 77.39657243970184,
  };

  positionB: google.maps.LatLngLiteral = {
    lat: 28.52387343192279,
    lng: 77.39296719927432,
  };

  mainOptions: google.maps.MapOptions = {
    center: this.positionA,
    zoom: 4,
  };

  polylineOptions: google.maps.PolylineOptions = {
    strokeColor: '#6d80b9c7',
    geodesic: true,
  };

  polyVertices: google.maps.LatLngLiteral[] = [];
  markerOptions: google.maps.MarkerOptions[] = [];
  currentPolylinePath: google.maps.LatLngLiteral[] = [];

  constructor(private httpClient: HttpClient, private formBuilder: FormBuilder) {
    this.apiLoaded = this.httpClient.jsonp(`${this.G_MAP_API}`, 'callback')
      .pipe(
        map(() => true),
        catchError(() => of(false))
      );

    this.latLngForm = this.formBuilder.group({
      latitudeA: [null, [Validators.required, Validators.pattern(/^-?\d+(\.\d+)?$/)]],
      longitudeA: [null, [Validators.required, Validators.pattern(/^-?\d+(\.\d+)?$/)]],
      latitudeB: [null, [Validators.required, Validators.pattern(/^-?\d+(\.\d+)?$/)]],
      longitudeB: [null, [Validators.required, Validators.pattern(/^-?\d+(\.\d+)?$/)]],
      time: [null, [Validators.required, Validators.min(0)]],
    });
  }

  ngOnInit() {
    this.initializeMarkers();
  }

  ngOnDestroy() {
    this.droneUpdateSubscription.unsubscribe();
  }

  initializeMarkers() {
    this.markerOptions = [{
      draggable: false,
      label: 'S',
      position: this.positionA,
    }];
  }

  onSimulate() {
    if (!this.latLngForm.valid) {
      console.error('Invalid form values.');
      return;
    }
  
    const { latitudeA, longitudeA, latitudeB, longitudeB, time } = this.latLngForm.value;
  
    const distance = this.calculateDistance(); // in kilometers
    const totaltime = this.latLngForm.get('time')?.value; // in seconds
    const averageSpeed = totaltime > 0 ? (distance / (totaltime / 3600)) : 0; // km/h
  
    this.positionA = { lat: +latitudeA, lng: +longitudeA };
    this.positionB = { lat: +latitudeB, lng: +longitudeB };
    this.time = (totaltime * 1000) / this.numSteps;
  
    this.latLngForm.disable();
    this.polyVertices = [this.positionA, this.positionB];
    this.updateMarker(this.positionB.lat, this.positionB.lng, 1, false, 'E');
    this.startDroneUpdates();
  }
  

  startDroneUpdates() {
    this.droneUpdateSubscription.unsubscribe();
    this.droneUpdateSubscription = interval(this.time).subscribe(() => {
      if (this.progressCount < this.numSteps) {
        this.updateDronePosition(this.progressCount / this.numSteps);
        this.progressCount++;
      } else {
        this.droneUpdateSubscription.unsubscribe();
      }
    });

    
  }

  calculateDistance(): number {
    // Extract latitude and longitude from the form
    const lat1 = this.latLngForm.get('latitudeA')?.value;
    const lon1 = this.latLngForm.get('longitudeA')?.value;
    const lat2 = this.latLngForm.get('latitudeB')?.value;
    const lon2 = this.latLngForm.get('longitudeB')?.value;
  
    if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) {
      console.error('Form values are not available.');
      return 0;
    }
  
    // Convert degrees to radians
    const toRadians = (degrees: number) => degrees * (Math.PI / 180);
  
    // Radius of the Earth in kilometers
    const R = 6371;
  
    // Calculate differences
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
  
    // Apply Haversine formula
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
    // Distance in kilometers
    return R * c;
  }
  
  

  onSeek(event: MouseEvent): void {
    const progressBar = event.currentTarget as HTMLElement;
    const clickX = event.offsetX;
    const totalWidth = progressBar.clientWidth;
    const clickedPercentage = Math.max(0, Math.min(100, (clickX / totalWidth) * 100));
    this.progressCount = Math.round(clickedPercentage);
    this.updateDronePosition(this.progressCount / 100);
  }

  updateDronePosition(fraction: number): void {
    const position: google.maps.LatLngLiteral = {
      lat: this.positionA.lat + fraction * (this.positionB.lat - this.positionA.lat),
      lng: this.positionA.lng + fraction * (this.positionB.lng - this.positionA.lng),
    };

    this.markerOptions[0] = {
      position,
      icon: this.MARKER_ICON,
      draggable: false,
    };

    this.currentPolylinePath = [this.positionA, position];
   
    this.logDistance(position);
  }


  logDistance(position: google.maps.LatLngLiteral) {
    const start = new google.maps.LatLng(this.positionA.lat, this.positionA.lng);
    const current = new google.maps.LatLng(position.lat, position.lng);
    const distanceInMeters = google.maps.geometry.spherical.computeDistanceBetween(start, current);
    const distanceInKilometers = distanceInMeters / 1000; // Convert meters to kilometers
    
   
    
    // Update the distance in the HTML
    const distanceValue = document.getElementById('distance-value');
    if (distanceValue) {
        distanceValue.textContent = distanceInKilometers.toFixed(2);
    }
}

calculateDirection(): string {
  const lat1 = this.positionA.lat;
  const lon1 = this.positionA.lng;
  const lat2 = this.positionB.lat;
  const lon2 = this.positionB.lng;

  const toRadians = (degrees: number) => degrees * (Math.PI / 180);

  const dLon = toRadians(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRadians(lat2));
  const x = Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
            Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(dLon);
  const bearing = Math.atan2(y, x);

  // Convert bearing to degrees
  const bearingDegrees = (bearing * 180 / Math.PI + 360) % 360;

  // Determine cardinal direction
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearingDegrees / 45) % 8;

  return directions[index];
}



  updateMarker(lat: number, lng: number, index: number, icon: boolean = false, label: string = '') {
    this.markerOptions[index] = {
      position: { lat, lng },
      icon: icon ? this.MARKER_ICON : '',
      label,
      draggable: false,
      zIndex: icon ? 1111 : 0,
    };
  }

  onPause() {
    this.simulatePaused = true;
    this.droneUpdateSubscription.unsubscribe();
  }

  onResume() {
    if (this.simulatePaused) {
      this.simulatePaused = false;
      this.startDroneUpdates();
    }
  }

  onReset() {
    this.simulatePaused = false;
    this.latLngForm.reset();
    this.latLngForm.enable();
    this.initializeMarkers();
    this.polyVertices = [];
    this.currentPolylinePath = [];
    this.progressCount = 0;
    this.droneUpdateSubscription.unsubscribe();
  }
}
