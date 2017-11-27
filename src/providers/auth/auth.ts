import { Subject, Observable, Observer } from 'rxjs';
import { Http } from '@angular/http';
import { Injectable } from '@angular/core';
import { SafariViewController } from '@ionic-native/safari-view-controller';
import { Storage } from '@ionic/storage';

import { environmentProd as environment }   from '../../app/environment.prod';

/*
  Generated class for the AuthProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
@Injectable()
export class AuthProvider {

  tokens = new Subject<string>();

  callbackUrl : string = environment.packageIdentifier + '://' + environment.domain + '/cordova/' + environment.packageIdentifier + '/callback';

  constructor(public http: Http, private safariViewController: SafariViewController, private storage: Storage) {
    console.log('Hello AuthProvider Provider');
  }

  public login() {
    this.safariViewController.isAvailable()
    .then((available: boolean) => {
        if (available) {
          //https://territoryhelper.com/api/auth?response_type=code&client_id=[CLIENT_ID]&redirect_uri=[CALLBACK]
          let url = 'https://' + environment.domain + '/auth?response_type=code&client_id=' + environment.clientId + '&redirect_uri=' + encodeURI(this.callbackUrl);
          
          console.log("url: " + url);
          this.safariViewController.show({
            url: url,
            hidden: false,
            animated: false,
            transition: 'curl',
            enterReaderModeIfAvailable: true,
            tintColor: '#ff0000'
          })
          .subscribe((result: any) => {
              if(result.event === 'opened') console.log('Opened');
              else if(result.event === 'loaded') console.log('Loaded');
              else if(result.event === 'closed') console.log('Closed');
            },
            (error: any) => console.error(error)
          );
  
        } else {
          // use fallback browser, example InAppBrowser
        }
      }
    );
  }

  public getToken(code: string) {
    let self = this;
    let url = 'https://' + environment.domain + '/token?grant_type=authorization_code&code='+ code + '&redirect_uri=' + encodeURI(this.callbackUrl) + '&client_id=' + environment.clientId + '&client_secret=' + environment.clientSecret;
    this.http.post(url, {}).subscribe(
      (response) => {
        let data = response.json();
        console.log("getToken", data);
        self.storage.set('access_token', data.access_token);
        self.storage.set('refresh_token', data.refresh_token);
        self.storage.set('token_type', data.token_type);

        var expiredAt = new Date();
        expiredAt.setSeconds(expiredAt.getSeconds() + data.expires_in);

        self.storage.set('expires_at', expiredAt);
        self.tokens.next(data.access_token);
      },
      error => {
        console.log("getToken error: " + error);
      }
    );
  }

  public refreshToken(code: string) {
    let self = this;
    //https://territoryhelper.com/api/token?grant_type=refresh_token&client_id=CLIENT_ID&client_secret=CLIENT_SECRET
    let url = 'https://' + environment.domain + '/token?grant_type=refresh_token&client_id=' + environment.clientId +  '&client_secret=' + environment.clientSecret;
    this.http.post(url, {}).subscribe(
      (response) => {
        let data = response.json();
        console.log("refreshToken", data);
        self.storage.set('access_token', data.access_token);
        self.storage.set('refresh_token', data.refresh_token);
        self.storage.set('token_type', data.token_type);

        var expiredAt = new Date();
        expiredAt.setSeconds(expiredAt.getSeconds() + data.expires_in);

        self.storage.set('expires_at', expiredAt);
        self.tokens.next(data.access_token);
      },
      error => {
        console.log("getToken error: " + error);
      }
    );
  } 

  public getTokenChanges() : Observable<string> {
    return this.tokens.asObservable();
  }

  public isAuthenticated() {
    let self = this;
    return Observable.create((observer : Observer<boolean>) => {
      this.storage.get('expires_at').then(expiresAt => {
        let rv = Date.now() < expiresAt;
        observer.next(rv);
        observer.complete();
      });

    });
  }

  public logout(token?: string) {
    //https://territoryhelper.com/api/token/revoke?token=TOKEN
    //let url = environment.domain + '/token/revoke?token=' + token;

    return Observable.create((observer : Observer<boolean>) => {
      Observable.forkJoin(Observable.fromPromise(this.storage.remove('access_token')),
                        Observable.fromPromise(this.storage.remove('refresh_token')),
                        Observable.fromPromise(this.storage.remove('token_type')),
                        Observable.fromPromise(this.storage.remove('expires_at'))).subscribe(

          response => {
            observer.next(true);
            observer.complete();
          },
          error => {
            observer.next(false);
            observer.complete();
          }
      );
    });
  }




}

