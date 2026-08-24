/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  PCS DELETE PROCEDURE
; Change Person    :  ASLAM
; Last Change Date :  16/11/2024 10.00 AM 
; =============================================  */  

CREATE PROCEDURE PROC_Stock_IssueToPrdn_Update (@ID Int,@StyleNo Varchar(20),@PartId int,@ColId Int,@SizeId Int,@SourceStageID Int,@Pcs Int,@LotNo Varchar(15)) AS  DECLARE @Coycode Int,@Ordid Int,@StageId Int,@GodId Int,@StockQty Int,@FinalStage Char(1),@SeqNo int,@PartyId Int,@PcsStockId Int ,@OldId Int,@OldCoycode Int,@OldOrdid Int,@OldStyleNo Varchar(20),@OldStageId Int,@OldPartId Int,@OldGodId Int,@OldColId Int,@OldSizeId Int,@OldStockQty Int,@OldSourceStageId Int,@OldFinalStage Char(1),@OldSeqNo int,
@OldPartyId Int,@OldPcsStockId Int,@ProcessType Char(1),@RejectionTypeId Int ,@OldDelType as Varchar(30),@FinishedStageId int ,@OldBuyerId int  ,@LotId Int   ,@Prod_Without_Lot_Despatch_WithLot as char(1), @LotwiseStockReqd   char(1)   ,@GAN_PCS Char(1)  
,@Knit_Woven_Both_OrderType as char(1), @GAN_RewrkFlg Char(1) ='N',@EmpID  INT


SELECT @LotwiseStockReqd = isNull(LotwiseStockReqd,'Y') from Options   
SELECT @Prod_Without_Lot_Despatch_WithLot = isNull(Prod_Without_Lot_Despatch_WithLot,'Y') from Options1    
Select @OldId=@Id    
Select @OldCoycode = Coycode From Trs_LineInput as Trs_Pcs1 Where Id=@OldId     
select @OldPartyId = 0 From Trs_LineInput as Trs_Pcs1 Where Id=@OldId     
select @EmpID = isNull(EmpID,0) From Trs_LineInput as Trs_Pcs1 Where Id=@OldId     
SELECT @OldOrdid = Ordjobno From Trs_LineInput as Trs_Pcs1 Where Id=@OldId     
SELECT @LotwiseStockReqd = isNull(LotwiseStock,'Y') from Ordermas2 where Ordid=@OldOrdid  
SELECT @OldStageid = TargetStageId From Trs_LineInput as Trs_Pcs1 Where Id=@OldId     
SELECT @OldGodId = GodId From Trs_LineInput as Trs_Pcs1 Where Id=@OldId     
SELECT @ProcessType = 'P' from Trs_LineInput as trs_pcs1 where id=@oldid     
SELECT @RejectionTypeId = 0 from Trs_LineInput as trs_pcs1 where id=@oldid    
Select @OldSeqNo = SeqNo From Prod_Sequence Where Prod_Sequence.OrdId=@OrdId And Prod_Sequence.StyleNo=@StyleNo And Prod_Sequence.StageId=@StageId      SELECT @OldFinalStage = Mas_Dept.SemiFinish From Trs_LineInput as Trs_Pcs1 Inner Join Mas_JobWrkComp On  Trs_Pcs1.TargetStageID=Mas_JobWrkComp.Id Inner Join  Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId Where Trs_Pcs1.Id=@OldId      

SELECT @OldStyleNo = @StyleNo     
SELECT @OldColId = @ColId     
SELECT @OldSizeId = @SizeId    
SELECT @OldPartId = @PartId    
Select @OldSourceStageId = @SourceStageID    
SELECT @OldStockQty = Pcs from Trs_LineInput_Det trs_Pcs2 where Id = @ID and StyleNo = @StyleNo And colId = @ColId and  PartId = @PartID And SizeID = @SizeId And LotNo= @LotNo    
SELECT @OldDelType = '' From Trs_LineInput as  Trs_Pcs1 Where Id=@OldId      
SELECT @OldBuyerId = 0 From Trs_LineInput as Trs_Pcs1 Where Id=@OldId       
SELECT @GAN_PCS = IsNull(GRNAcceptance_Pcs,'N') from Options
SELECT @Knit_Woven_Both_OrderType = IsNull(Knit_Woven_Both_OrderType,'K') From OrderMas Where ORdid = @OldOrdid 
PRINT 'AS1'

if @GAN_PCS ='Y' and @Knit_Woven_Both_OrderType ='W' and @ProcessType ='R'
BEGIN
	SET @GAN_RewrkFlg ='Y'
END


if @OldDelType ='Sales'	    
begin  
	SELECT @FinishedStageID = @OldSourceStageId     
	SELECT @OldBuyerId = 1    
end  

else 		   

begin  
	SELECT  @FinishedStageID = -3     
	SELECT @OldBuyerId = Buyer From Trs_Pcs1 Where Id=@OldId    
end   /*SELECT Top 1 @FinishedStageID = StageId  From Pcs_StockTable A INNER JOIN Mas_JobWrkComp B ON A.StageId = B.ID INNER JOIN Mas_Dept C ON B.DeptId = C.DeptID INNER JOIN Trs_Pcs1 D ON A.ORdid = D.Ordjobno inner join (select Distinct ID,Styleno from 
Trs_Pcs2) E ON D.ID = E.ID and A.Styleno = E.StyleNo Where D.ID = @oldID And SEMIFINISH='F'   and StageId=-3 */  

if ltrim(@LotNo)<>''   	  
	SELECT @LotID = LotSno from mas_Lot where LotName =LTrim(@LotNo)     
else   	  
SELECT @LotId = 0     
if Rtrim(@LotwiseStockReqd) ='N' And RTrim(@Prod_Without_Lot_Despatch_WithLot)='Y'    
BEGIN     
	SELECT @LotId = 0     
END     
Begin       
if @OldBuyerid >0 and (@OldDelType='Despatch' or @OldDelType ='Sales')       
Begin  /*Insert into tmp_trg Values ('Despatch Update1 + ' + str(@OldstockQty))   Insert into tmp_trg Values ('OldCoycode + ' + str(@OldCoycode))   Insert into tmp_trg Values ('Oldpart + ' + str(@Oldpartid))   Insert into tmp_trg Values ('Stage + ' + str(
@FinishedStageId))   Insert into tmp_trg Values ('OldColid + ' + str(@OldColId)) */     

PRINT 'AS2'

Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty+@OldStockQty From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode =@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo and LotId = @LotID and Stageid=@FinishedStageId and PartId=@OldPartId and GodId=@OldGodId and PartyId=0 and Pcs_StockTableQty.ColId=@OldColid and Pcs_StockTableQty.SizeId=@OldSizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0    and IsNull(Pcs_StockTable.EmpID,0) = 0  

End       

If (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@OldStageId)='Piece' Or (@OldStageid=@OldSourceStageid)   or (Select Rtrim(IsNull(PcsType,'Piece')) From Mas_JobWrkComp Where Id=@OldStageId)='Bit'     

Begin  

if @GAN_RewrkFlg ='Y'
begin
 PRINT 'AS3'
Update Pcs_StockTableQty Set Pcs_StockTableQty.RewrkStk=isnull(Pcs_StockTableQty.RewrkStk,0)+@OldStockQty From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo and LotId = @LotID and Stageid=@OldSourceStageid and PartId=@OldPartId and GodId=@OldGodId and PartyId=0 and Pcs_StockTableQty.ColId=@OldColid and Pcs_StockTableQty.SizeId=@OldSizeId and IsNull(Pcs_StockTable.EmpID,0) = 0 and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End  

end

ELSE

begin       
 PRINT 'AS4'
Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty+@OldStockQty From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo and LotId = @LotID and Stageid=@OldSourceStageid and PartId=@OldPartId and GodId=@OldGodId and PartyId=0 and Pcs_StockTableQty.ColId=@OldColid and Pcs_StockTableQty.SizeId=@OldSizeId and IsNull(Pcs_StockTable.EmpID,0) = 0 and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End  

end

End          
if @OldDelType <> 'JobWork Return'       
begin   	 
 PRINT 'AS5'
 PRINT @OLDSTOCKQTY
 PRINT @oldcoycode
 print @oldordid
 print @oldstyleno
 print @lotid
 print @oldstageId
 print @OldPartId
 Print @OldColId
 print @oldSizeID
 print @processType
 print @OldPartyId
 print @OldGodId

 select * from Pcs_StockTable a inner join Pcs_StockTableQty b on a.PcsStockId = b.PcsStockId where ordid =@OldOrdid and Styleno =@OldStyleNo     And LotID = @LotId And coycode = @OldCoycode and StageId = @OldStageId and PartId = @OldPartId and PartyId = @OldPartyId And colid = @OldColId    And SizeId = @OldSizeId 


Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@OldStockQty From  Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo and LotId = @LotID  and Stageid=@OldStageId and PartId=@OldPartId and GodId=@OldGodId and PartyId=@OldPartyId and Pcs_StockTableQty.ColId=@OldColid and Pcs_StockTableQty.SizeId=@OldSizeId and IsNull(Pcs_StockTable.EmpID,0) = @EmpID  and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End      

end  

End          
Select @Coycode = Coycode From Trs_LineInput as Trs_Pcs1 Where Id=@Id        
select @PartyId = 0 From Trs_LineInput as Trs_Pcs1 Where Id=@Id          
SELECT @Ordid = Ordjobno From Trs_LineInput as Trs_Pcs1 Where Id=@Id          
SELECT @Stageid = TargetStageId From Trs_LineInput as Trs_Pcs1 Where Id=@Id           
SELECT @GodId = GodId From Trs_LineInput as Trs_Pcs1 Where Id=@Id          
Select @SeqNo = SeqNo From Prod_Sequence Where Prod_Sequence.OrdId=@Ordid And Prod_Sequence.StyleNo=@StyleNo And Prod_Sequence.StageId=@StageId  

SELECT @FinalStage = Mas_Dept.SemiFinish From Trs_LineInput as Trs_Pcs1 Inner Join Mas_JobWrkComp On Trs_Pcs1.TargetStageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId Where Trs_Pcs1.Id=@Id 

Select @SourceStageId = @SourceStageId         
SELECT @StockQty = @Pcs        
begin          

if @OldDelType <> 'JobWork Return'     

BEGIN     
 PRINT 'AS6'

Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty+@StockQty From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotID  and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and IsNull(Pcs_StockTable.EmpID,0) = @EmpID and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else  @RejectionTypeId End  

END    

If (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece' Or (@Stageid=@SourceStageid)   or (Select Rtrim(IsNull(PcsType,'Piece')) From Mas_JobWrkComp Where Id=@StageId)='Bit'    
Begin     

if @GAN_RewrkFlg ='Y'
begin
PRINT 'AS7'

Update Pcs_StockTableQty Set Pcs_StockTableQty.RewrkStk=isNull(Pcs_StockTableQty.RewrkStk,0)-@StockQty From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotID  and Stageid=@SourceStageId and PartId=@PartId and GodId=@GodId and PartyId=0 and IsNull(Pcs_StockTable.EmpID,0) = 0 and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G'
 and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End       

END 
ELSE 
BEGIN
PRINT 'AS8'
Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@StockQty From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotID  and Stageid=@SourceStageId and PartId=@PartId and GodId=@GodId and PartyId=0 and IsNull(Pcs_StockTable.EmpID,0) = 0 and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End       

END 
End        
if @OldBuyerid >0 and (@OldDelType='Despatch'   or @OldDelType ='Sales')   
Begin    /*Insert into tmp_trg Values ('Despatch Update2 - ' + str(@stockQty))*/       
PRINT 'AS9'
Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty-@StockQty From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotID and Stageid=@FinishedStageId and PartId=@PartId and GodId=@GodId and PartyId=0 and IsNull(Pcs_StockTable.EmpID,0) = 0 and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0           
End        
End 