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
addMarker($event: google.maps.MapMouseEvent|google.maps.IconMouseEvent) {
throw new Error('Method not implemented.');
}
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
    zoom: 2,
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
      latitude: [null, [Validators.required, Validators.pattern(/^-?\d+(\.\d+)?$/)]],
      longitude: [null, [Validators.required, Validators.pattern(/^-?\d+(\.\d+)?$/)]],
      time: [null, [Validators.required, Validators.min(0)]],
    });
  }

  ngOnInit() {
    this.initializeMarkers();
  }

  initializeMarkers() {
    this.markerOptions = [
      {
        draggable: false,
        label: 'S',
        position: this.positionA,
      },
    ];
  }

  onSimulate() {
    this.positionB = {
      lat: this.latLngForm.value.latitude,
      lng: this.latLngForm.value.longitude,
    };
    this.time = (this.latLngForm.value.time * 1000) / this.numSteps;

    this.latLngForm.disable();

    this.polyVertices = [this.positionA, this.positionB];

    this.updateMarker(this.positionB.lat, this.positionB.lng, 1, false, 'E');

    this.startDroneUpdates();
  }

  startDroneUpdates() {
    this.droneUpdateSubscription.unsubscribe(); // Unsubscribe from any existing subscription
    this.droneUpdateSubscription = interval(this.time).subscribe(() => {
      if (this.progressCount < this.numSteps) {
        const fraction = this.progressCount / this.numSteps;
        const intermediateLat = this.positionA.lat + fraction * (this.positionB.lat - this.positionA.lat);
        const intermediateLng = this.positionA.lng + fraction * (this.positionB.lng - this.positionA.lng);
        this.updateMarker(intermediateLat, intermediateLng, 0, true);

        this.progressCount++;
      } else {
        this.droneUpdateSubscription.unsubscribe();
      }
    });
  }

  onSeek(event: MouseEvent): void {
    const progressBar = event.currentTarget as HTMLElement;
    const clickX = event.offsetX;
    const totalWidth = progressBar.clientWidth;

    const clickedPercentage = Math.max(0, Math.min(100, (clickX / totalWidth) * 100));
    const roundedPercentage = Math.round(clickedPercentage);

    this.progressCount = roundedPercentage;
    this.updateDronePosition(roundedPercentage);
  }

  updateDronePosition(percentage: number): void {
    const index = Math.floor((percentage / 100) * this.numSteps);
    if (index >= 0 && index <= this.numSteps) {
      const fraction = index / this.numSteps;
      const position: google.maps.LatLngLiteral = {
        lat: this.positionA.lat + fraction * (this.positionB.lat - this.positionA.lat),
        lng: this.positionA.lng + fraction * (this.positionB.lng - this.positionA.lng),
      };

      this.markerOptions[0] = {
        position: position,
        icon: this.MARKER_ICON,
        draggable: false,
      };

      this.currentPolylinePath = [this.positionA, position];

      const start = new google.maps.LatLng(this.positionA.lat, this.positionA.lng);
      const current = new google.maps.LatLng(position.lat, position.lng);
      const distance = google.maps.geometry.spherical.computeDistanceBetween(start, current);

      console.log(`Distance traveled: ${distance.toFixed(2)} meters`);
    }
    this.onPause()
  }

  updateMarker(
    lat: number, lng: number, index: number,
    icon: boolean = false, label: string = ''
  ) {
    const position = { lat, lng };
    this.markerOptions[index] = {
      draggable: false,
      icon: icon ? this.MARKER_ICON : '',
      label: label,
      position: position,
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

  ngOnDestroy() {
    this.droneUpdateSubscription.unsubscribe();
  }
}
