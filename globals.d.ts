
// Declare global types for Google Maps API to avoid TypeScript errors.
declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          Autocomplete: new (
            inputField: HTMLInputElement,
            opts?: google.maps.places.AutocompleteOptions
          ) => google.maps.places.Autocomplete;
          // Add other Places API services or types here if needed, e.g.:
          // AutocompleteService: new () => google.maps.places.AutocompleteService;
          // PlacesServiceStatus: typeof google.maps.places.PlacesServiceStatus;
          // PlacesService: new (attrContainer: HTMLDivElement | google.maps.Map) => google.maps.places.PlacesService;
        };
        event?: {
          clearInstanceListeners: (instance: object) => void;
          // Define other event related methods if necessary
        };
        // Define other google.maps base types if needed e.g. Map, LatLng etc.
      };
    };
  }

  // Define the google.maps.places namespace and interfaces for use in component props or refs
  namespace google.maps.places {
    interface Autocomplete {
      addListener: (eventName: string, handler: () => void) => google.maps.MapsEventListener;
      getPlace: () => PlaceResult;
      setTypes: (types: string[]) => void;
      setComponentRestrictions: (restrictions: ComponentRestrictions) => void;
      // Add other methods as needed from the Autocomplete class
    }

    interface AutocompleteOptions {
      bounds?: LatLngBounds | LatLngBoundsLiteral;
      componentRestrictions?: ComponentRestrictions;
      fields?: string[];
      placeIdOnly?: boolean;
      strictBounds?: boolean;
      types?: string[];
      // Add other options as needed
    }

    interface ComponentRestrictions {
      country?: string | string[];
    }

    interface PlaceResult {
      address_components?: AddressComponent[];
      formatted_address?: string;
      geometry?: PlaceGeometry;
      name?: string;
      // Add other PlaceResult properties as needed (e.g., photos, reviews, place_id, etc.)
    }

    interface AddressComponent {
      long_name: string;
      short_name: string;
      types: string[];
    }

    interface PlaceGeometry {
      location?: LatLng;
      viewport?: LatLngBounds;
      // Add other geometry properties
    }

    // Basic LatLng and LatLngBounds interfaces (can be expanded if more features are used)
    interface LatLng {
      lat: () => number;
      lng: () => number;
    }

    interface LatLngLiteral {
      lat: number;
      lng: number;
    }

    interface LatLngBounds {
      // Define methods if used, e.g., getCenter, toSpan, etc.
    }
    interface LatLngBoundsLiteral {
        east: number;
        north: number;
        south: number;
        west: number;
    }
  }

  namespace google.maps {
        interface MapsEventListener {
            remove: () => void;
        }
    }
}

// Adding an empty export makes this file a module, which is required for global augmentations.
export {};
