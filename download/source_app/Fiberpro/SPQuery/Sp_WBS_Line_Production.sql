/*                  
;=============================================                  
; Author  :  Global Software's                  
; Create date  :  01/Nov/2019                  
; Create By  :  ASLAM                  
; Description  :  Stored Procedure for Posting the Line Output Production Details for commando cloud Line Planning
; Change Person  :  ASLAM                
; Last Change Date :  29/Nov/2024 11.30 AM                  
; =============================================   */ 

CREATE Procedure Sp_WBS_Line_Production (@OrdId Int,@StyleNo Varchar(20),@PartId Int,@ColId int,@Coyciode int,@LineID int,@SizeID int,@ProdPcs int,@Dt DateTime) As 

Declare @finishpercent numeric(18,2),@exsfinishpercent numeric(18,2),@EntryOption int


if EXISTS(Select *  FROM WBS_LineProduction WHERE Ordid = @Ordid And Styleno = @StyleNo And PartID = @PartID And ColID = @ColID And LineID = @LineID And SizeId = @SizeID And Dt=@Dt) 

BEGIN
Update WBS_LineProduction Set ProdPcs=@ProdPcs Where OrdId=@OrdId And StyleNo=@StyleNo And PartId=@PartId And ColID = @ColID And LineID = @LineID And SizeId = @SizeID And Dt=@Dt
End 


Else 


Begin 


Insert Into WBS_LineProduction (OrdId,StyleNo,PartId,colId,Coycode ,LineId,SizeID,ProdPcs,Dt) Values (@OrdId,@StyleNo,@PartId,@ColId,@Coyciode,@LineID,@SizeID,@ProdPcs,@Dt) 

End 

