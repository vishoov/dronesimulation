import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, interval, Subscription } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { FormArray, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  destinationArray: FormArray = this.formBuilder.array([]);

  totalDistance: number = 0;
  averageSpeed: number = 0;
  elapsedTime: number = 0;

  title: string = 'Drone Simulation';
  G_API_KEY: string = environment.G_API_KEY;
  G_MAP_API: string = `https://maps.googleapis.com/maps/api/js?key=${this.G_API_KEY}&libraries=geometry`;
  MARKER_ICON: string = 'assets/drone.png';

  latLngForm: FormGroup;
  private droneUpdateSubscription: Subscription = new Subscription();
  apiLoaded: Observable<boolean>;

  simulatePaused: boolean = false;
  progressCount: number = 0;
  numSteps: number = 100; // Number of intermediate positions per segment
  time: number = 0; // in milliseconds
  totalProgress: number = 0;


  positionA: google.maps.LatLngLiteral = {
    lat: 28.522308592619723,
    lng: 77.39657243970184,
  };

  destinations: google.maps.LatLngLiteral[] = [];
  currentSegment: number = 0;
  segmentProgress: number = 0;
  totalSegments: number = 0;

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
      destinationArray: this.formBuilder.array([])
    });

    this.destinationArray = this.latLngForm.get('destinationArray') as FormArray;
  }

  ngOnInit() {
    this.latLngForm = this.formBuilder.group({
      latitudeA: [null, [Validators.required, Validators.pattern(/^-?\d+(\.\d+)?$/)]],
      longitudeA: [null, [Validators.required, Validators.pattern(/^-?\d+(\.\d+)?$/)]],
      destinationArray: this.formBuilder.array([])
    });

    this.destinationArray = this.latLngForm.get('destinationArray') as FormArray;
    this.addDestination(); // Add initial destination
  }
  
  createDestination(): FormGroup {
    return this.formBuilder.group({
      latitudeB: [null, [Validators.required, Validators.pattern(/^-?\d+(\.\d+)?$/)]],
      longitudeB: [null, [Validators.required, Validators.pattern(/^-?\d+(\.\d+)?$/)]],
      time: [null, [Validators.required, Validators.min(0)]]
    });
  }
  
  ngOnDestroy() {
    this.droneUpdateSubscription.unsubscribe();
  }
  addDestination() {
    this.destinationArray.push(this.createDestination());
  }

  removeDestination(index: number) {
    this.destinationArray.removeAt(index);
  }

  onSimulate() {
    if (!this.latLngForm.valid) {
      console.error('Please dont leave form unfilled.');
      return;
    }

    const { latitudeA, longitudeA } = this.latLngForm.value;
    this.positionA = { lat: Number(latitudeA), lng: Number(longitudeA) };

    this.destinations = [this.positionA];
    let totalTime = 0;

    this.destinationArray.controls.forEach((control: AbstractControl) => {
      const dest = control.value;
      this.destinations.push({ lat: Number(dest.latitudeB), lng: Number(dest.longitudeB) });
      totalTime += Number(dest.time);
    });

    this.totalSegments = this.destinations.length - 1;
    this.polyVertices = this.destinations;
    this.updateMarkers();
    this.time = (totalTime * 1000) / (this.numSteps * this.totalSegments);

  
    this.elapsedTime = 0;

    this.latLngForm.disable();
    this.startDroneUpdates();
  }

  updateMarkers() {
    this.markerOptions = this.destinations.map((pos, index) => ({
      position: pos,
      label: index === 0 ? 'S' : (index === this.destinations.length - 1 ? 'E' : String(index)),
      draggable: false
    }));
  }
  

  startDroneUpdates() {
    this.droneUpdateSubscription.unsubscribe();
    this.progressCount = 0;
    this.currentSegment = 0;
    this.segmentProgress = 0;
  
    this.droneUpdateSubscription = interval(this.time).subscribe(() => {
      if (this.currentSegment < this.totalSegments) {
        this.updateDronePosition();
        this.segmentProgress++;
        this.progressCount++;
        this.elapsedTime += this.time/1000; // Convert milliseconds to seconds
  
        if (this.segmentProgress >= this.numSteps) {
          this.currentSegment++;
          this.segmentProgress = 0;
        }
      } else {
        this.droneUpdateSubscription.unsubscribe();
      }
    });
  }
  

  updateDronePosition(): void {
    const startPos = this.destinations[this.currentSegment];
    const endPos = this.destinations[this.currentSegment + 1];
    const fraction = this.segmentProgress / this.numSteps;

    const position: google.maps.LatLngLiteral = {
      lat: startPos.lat + fraction * (endPos.lat - startPos.lat),
      lng: startPos.lng + fraction * (endPos.lng - startPos.lng),
    };

    this.markerOptions[0] = {
      position,
      icon: this.MARKER_ICON,
      draggable: false,
    };

    this.currentPolylinePath = [startPos, position];
    this.logDistance(position);

    const totalTime = this.destinationArray.controls.reduce((acc, control) => acc + Number(control.get('time')?.value || 0), 0);
    const elapsedTime = this.destinationArray.controls.slice(0, this.currentSegment).reduce((acc, control) => acc + Number(control.get('time')?.value || 0), 0);
    const currentSegmentTime = Number(this.destinationArray.at(this.currentSegment).get('time')?.value || 0);
    this.totalProgress = ((elapsedTime + (currentSegmentTime * fraction)) / totalTime) * 100;
    
  }







  logDistance(position: google.maps.LatLngLiteral) {
    // Initialize total distance to 0
    let totalDistance = 0;
  
    // Convert position to LatLng object
    const current = new google.maps.LatLng(position.lat, position.lng);
  
    // Iterate over all segments to calculate the distance traveled
    for (let i = 0; i < this.destinations.length - 1; i++) {
      const start = new google.maps.LatLng(this.destinations[i].lat, this.destinations[i].lng);
      const end = new google.maps.LatLng(this.destinations[i + 1].lat, this.destinations[i + 1].lng);
  
      // Calculate the distance from the start of the current segment to the current position
      if (i === this.currentSegment) {
        // Calculate the distance from start to current position in this segment
        const distanceToCurrent = google.maps.geometry.spherical.computeDistanceBetween(start, current);
        totalDistance += distanceToCurrent;
        break;
      } else {
        // Calculate the distance for the whole segment
        const distanceSegment = google.maps.geometry.spherical.computeDistanceBetween(start, end);
        totalDistance += distanceSegment;
      }
    }
  
   
    this.totalDistance = totalDistance / 1000; // Convert meters to kilometers
   
  }
  
 

  onSeek(event: MouseEvent): void {
    const progressBar = event.currentTarget as HTMLElement;
    const clickX = event.offsetX;
    const totalWidth = progressBar.clientWidth;
    const clickedPercentage = Math.max(0, Math.min(100, (clickX / totalWidth) * 100));
  
    // Calculate the total time for the entire journey
    const totalTime = this.destinationArray.controls.reduce((acc, control) => acc + Number(control.get('time')?.value || 0), 0);
  
    // Calculate the elapsed time based on the clicked percentage
    const elapsedTime = (clickedPercentage / 100) * totalTime;
  
    // Determine the current segment and segment progress based on the elapsed time
    let accumulatedTime = 0;
    this.currentSegment = 0;
    this.segmentProgress = 0;
  
    for (let i = 0; i < this.totalSegments; i++) {
      const segmentTime = Number(this.destinationArray.at(i).get('time')?.value || 0);
      if (elapsedTime < accumulatedTime + segmentTime) {
        this.currentSegment = i;
        this.segmentProgress = ((elapsedTime - accumulatedTime) / segmentTime) * this.numSteps;
        break;
      }
      accumulatedTime += segmentTime;
    }
  
    // Update markers to reflect changes
    this.updateMarkers();
  
   
    this.updateDronePosition();
    this.onPause(); 
  
   
    this.totalProgress = clickedPercentage;
  
   
    this.elapsedTime = elapsedTime;
    
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
    this.latLngForm.enable();
    this.destinationArray.clear();
    this.addDestination(); // Add initial destination
    this.polyVertices = [];
    this.currentPolylinePath = [];
    this.progressCount = 0;
    this.currentSegment = 0;
    this.segmentProgress = 0;
    this.totalDistance = 0;
    this.averageSpeed = 0;
    this.elapsedTime = 0;
    this.droneUpdateSubscription.unsubscribe();
    this.updateMarkers();
  }
}