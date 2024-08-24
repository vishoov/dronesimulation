import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { GoogleMapsModule } from '@angular/google-maps'; // Import GoogleMapsModule if needed in tests
import { FormsModule, ReactiveFormsModule } from '@angular/forms'; // Import required Angular forms modules
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        GoogleMapsModule, // Import GoogleMapsModule if it’s used in the component
        FormsModule,
        ReactiveFormsModule
      ],
      declarations: [AppComponent]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'Drone-Simulator-with-Angular-v16'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('Drone-Simulator-with-Angular-v16');
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.content span')?.textContent).toContain('Drone-Simulator-with-Angular-v16 app is running!');
  });
});
